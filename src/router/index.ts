import { Hono } from 'hono'
import mediaRoute from './media.route.js'



const routes = new Hono()

routes.route('/media', mediaRoute)



export { routes }