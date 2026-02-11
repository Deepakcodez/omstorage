
import { Hono, } from "hono";
import { uploadImageMedia, uploadMultipleImageMedia, uploadVideoMedia } from "../controller/media.controller.js";
import { uploadAuth } from "../middleware/auth.js";

const mediaRoute = new Hono();

mediaRoute.post('/upload/single/image', uploadAuth, uploadImageMedia);
mediaRoute.post('/upload/multiple/images', uploadAuth, uploadMultipleImageMedia);
mediaRoute.post('/upload/single/video', uploadAuth, uploadVideoMedia);




export default mediaRoute    