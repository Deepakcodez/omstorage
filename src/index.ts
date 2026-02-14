import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { routes } from './router';
import { serveStatic } from "hono/bun"

const app = new Hono()

const port = Number(process.env.PORT) || 8000
// test cicd from deploy sh
//this is from github action
app.use("*", cors({
    origin: ["*"],
    allowHeaders: ["Content-Type", "Authorization", "x-upload-secret"],
    allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    // credentials: true,
}));


app.use("/uploads/*", serveStatic({
    root: "./"
}))

app.use("/public/*", serveStatic({
    root: "./"
}))

app.get('/', (c) => {
    return c.json({ message: 'Media Service Running 🚀' })
})

app.get('/gallery', async (c) => {
    return c.html(await Bun.file('./public/gallery.html').text())
})

app.route('/api', routes)

app.notFound((c) => {
    return c.text('Not Found', 404)
})

app.onError((err, c) => {
    console.error(`${err}`)
    return c.text(`Error Message : ${err}`, 500)
})

export default {
    port,
    fetch: app.fetch
}
