import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { routes } from './router';

const app = new Hono()

const port = Number(process.env.PORT) || 8000

app.use("*", cors({
    origin: ["*"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "PUT", "PATCH", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    credentials: true,
}));


app.get('/', (c) => {
    return c.json({ message: 'Media Service Running 🚀' })
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
