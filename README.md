# TODO web application

A simple TODO web application developed to demonstrate how to create web apps from the ground up.

In order to use this webapp the [REST backend][1] must be up and running.

## How to run a web server

For development purpose you can install the Node `http-server` package to have a simple web server:

```
npm install -g http-server
```

And then run it like this:

```
http-server . # remind this final dot, it means serve content from here
```

The server will be listening on port 8080.

This will help development up to tag `lab06` (commit 3597a11). After that commit, a virtual host and a reverse proxy are
required to pass API requests to [REST server][1].

## Sample virtual host

Create a new site config in Apache2 under `/etc/apache2/sites-available`, let's call it `soi-lab.conf`. This will be
its content:

```
<VirtualHost *:80>
    ServerName soi-lab.local
    ServerAlias www.soi-lab.local
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/lab06
    LogLevel info
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
    ProxyPass     /api/        http://localhost:8000/
</VirtualHost>
```

Then enable it by running:

```
$ sudo a2ensite soi-lab
$ sudo systemctl reload apache2
```

[1]: https://github.com/SOI-Unipr/todo-server
