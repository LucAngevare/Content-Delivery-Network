const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
// eslint-disable-next-line
const env = require("dotenv").config();
const Busboy = require("busboy");

var auth = require("auth.js")

var pathObj = {};
var filterFileArray = [];

fs.readdir(path.join(__dirname + "/files"), (err, files) => {
    if (err) console.log(err);
    files.forEach((fileName) => {
        filterFileArray.push(fileName);
        pathObj[fileName] = path.join(__dirname + `\\files\\${fileName}`);
    })
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use((req, res, next) => {
    if (req.hostname === 'cdn.lucangevare.nl') {
      return next();
    }
});

app.get("/fetch/:password/:file", (req, res) => {
    if (!auth["passwords"].includes(req.params["password"])) return res.status(401).json({ success: false, error: "Unauthorized" })
    if (req.params["file"] === "all") {
        res.json({
            success: true,
            basePath: "/static",
            download: "/download",
            files: filterFileArray,
            pathObj: pathObj
        });
    } else res.sendFile(pathObj[req.params["file"]], (err) => {
        if (err) return res.status(400).json({
            success: false,
            problem: "No file found",
            error: err
        });
    });
});

app.delete("/delete/:password/:file", async (req, res) => {
    if (!auth["passwords"].includes(req.params["password"])) return res.status(401).json({ success: false, error: "Unauthorized" })
    if (req.params["file"] === "all") {
        try {
            fs.rm("./files", {
                recursive: true
            }, () => {
                fs.mkdir("./files", () => {
                    res.status(200).json({
                        success: true,
                        message: "/files deleted."
                    });
                });
            });
        } catch (err) {
            res.json({
                success: false,
                error: err
            });
        }
    } else {
        fs.unlink(`./files/${req.params["file"]}`, (err) => {
            if (err) return res.status(400).json({
                success: false,
                error: err,
                message: "This problem was likely caused because the file's name is incorrect or the file doesn't exist."
            });
            res.status(200).json({
                success: true,
                message: `/static/${req.params["file"]} has been removed.`
            });
        });
    }
});

app.get("/download/:password/:file", (req, res) => {
    if (!auth["passwords"].includes(req.params["password"])) return res.status(401).json({ success: false, error: "Unauthorized" })
    res.download(pathObj[req.params["file"]], (err) => {
        if (err) return res.status(400).json({ success: false, error: err });
    })
})

app.get("/authenticate/:old_password/:password", (req, res) => {
    if (!req.params["password"].length >= 4) return req.status(400).json({ success: false, reason: "password too small" });
    if (!auth["passwords"].includes(req.params["old_password"])) return res.status(401).json({ success: false, error: "Unauthorized" })

    auth["passwords"][auth["passwords"].indexOf(req.params["old_password"])] = req.params["password"];
    fs.writeFile("./auth.js", JSON.stringify(auth)).then(() => {
	res.status(201).json({ success: true, message: "Successfully updated password" })
	auth = require("./auth.js")
    })
})

app.post("/bring/:password", (req, res) => {
    if (!auth["passwords"].includes(req.params["password"])) return res.status(401).json({ success: false, error: "Unauthorized" })
    var busboy = new Busboy({
        headers: req.headers
    });
    let real_filename = "";
    busboy.on("file", function (file, filename) {
        var saveTo = path.join("./files", filename);
        file.pipe(fs.createWriteStream(saveTo));
        real_filename += filename;
    });
    busboy.on("finish", function () {
        res.status(201).json({
            success: true,
            root: "/static",
            filename: real_filename,
            full_path: `/static/${real_filename}`
        });
    });
    return req.pipe(busboy);
});

app.listen(process.env.PORT || 443, () => {
    `Listening on port ${ process.env.PORT || 443 }`;
});
