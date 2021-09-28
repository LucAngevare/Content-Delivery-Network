const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
// eslint-disable-next-line
const env = require("dotenv").config();
const Busboy = require("busboy");

var auth = require("./auth.json")

var pathObj = {};
var filterFileArray = [];

function updateFiles(pathObj, filterFileArray) {
    fs.readdir(path.join(__dirname + "/files"), (err, files) => {
        if (err) console.log(err);
	filterFileArray = [];
	for (var val in pathObj) delete pathObj[val]; //Emptying the object without garbage collection
        files.forEach((fileName) => {
            filterFileArray.push(fileName);
            pathObj[fileName] = path.join(__dirname + `/files/${fileName}`);
        })
    });
}

updateFiles(pathObj, filterFileArray);

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
            basePath: "/fetch",
            download: "/download",
            files: filterFileArray,
            pathObj: pathObj
        });
    } else res.sendFile(path.join(__dirname, "/files/", req.params["file"]), (err) => {
        try {
	    if (err) res.status(400).json({
                success: false,
                problem: "No file found",
                error: err
            });
	} catch(err) {
	    console.log(err);
	}
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
            if (err) res.status(400).json({
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
    updateFiles(pathObj, filterFileArray);
});

app.get("/download/:password/:file", (req, res) => {
    if (!auth["passwords"].includes(req.params["password"])) return res.status(401).json({ success: false, error: "Unauthorized" })
    res.download(pathObj[req.params["file"]], (err) => {
        if (err) res.status(400).json({ success: false, error: err });
    })
})

app.get("/authenticate/:old_password/:password", (req, res) => {
    if (!req.params["password"].length >= 4) return res.status(400).json({ success: false, reason: "password too small" });
    if (!auth["passwords"].includes(req.params["old_password"])) res.status(401).json({ success: false, error: "Unauthorized" })

    auth["passwords"][auth["passwords"].indexOf(req.params["old_password"])] = req.params["password"];
    fs.writeFile("./auth.json", JSON.stringify(auth), () => {
	res.status(201).json({ success: true, message: "Successfully updated password" })
	auth = require("./auth.json")
    })
})

app.post("/bring/:password", (req, res) => {
    if (!auth["passwords"].includes(req.params["password"])) return res.status(401).json({ success: false, error: "Unauthorized" })
    var busboy = new Busboy({
        headers: req.headers
    });
    let real_filename = "";
    busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
	var saveTo = path.join("./files/", filename);
	file.pipe(fs.createWriteStream(saveTo));
        real_filename += filename;
    });
    busboy.on("finish", function() {
        res.status(201).json({
            success: true,
            root: "/fetch",
            filename: real_filename,
            full_path: `/fetch/${req.params["password"]}/${real_filename}`
        });
    });
    updateFiles(pathObj, filterFileArray);
    return req.pipe(busboy);
});

app.listen(process.env.PORT || 443, () => {
    `Listening on port ${ process.env.PORT || 443 }`;
});
