# Content-Delivery-Network

I was planning to make a Content Delivery Network for a while now, and I finally did. This makes it able for me to upload files on one desktop and render or download them on another. I finally bought a domain name (lucangevare.nl) so there's no need for me to remember any IP or anything, I can just go to cdn.lucangevare.nl and do the stuff. I'm using some form of security in the way that there's a password requirement, but I didn't really care enough to make a real authentication way. If I were to find ways to hack this form of authentication. I'd probably find a few ways to break it in a few days' time, let alone the fact that if I actually use it programmatically, the password could easily get stolen.

# Routes

* `/fetch/:password/all` (GET)
* `/fetch/:password/:file` (GET)
* `/download/:password/all` (GET)
* `/download/:password/:file` (GET)
* `/bring/:password` (POST)
* `/delete/:password/all` (DELETE)
* `/delete/:password/:file` (DELETE)
* `/authenticate/:old_password/:new_password` (GET for some reason, idk)

I will be making a feature to auto-delete things and things, so stay tuned... I guess
