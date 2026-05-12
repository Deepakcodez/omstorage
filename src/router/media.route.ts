
import { Hono, } from "hono";
import { uploadImageMedia, uploadMultipleImageMedia, uploadVideoMedia, getAllMedia, getMediaByProject, deleteMedia, StreamedVideoByName, StreamedVideoById, StreamedVideoByProjectAndName, getMedia } from "../controller/media.controller.js";
import { uploadAuth } from "../middleware/auth.js";

const mediaRoute = new Hono();

mediaRoute.post('/upload/single/image', uploadAuth, uploadImageMedia);
mediaRoute.post('/upload/multiple/images', uploadAuth, uploadMultipleImageMedia);
mediaRoute.post('/upload/single/video', uploadAuth, uploadVideoMedia);

// Get routes
mediaRoute.get('/stream/video/*', StreamedVideoByName);
mediaRoute.get('/all', getAllMedia);
mediaRoute.get('/project/:project', getMediaByProject);
mediaRoute.get('/video/id/:id', StreamedVideoById);
mediaRoute.get('/video/:project/:name', StreamedVideoByProjectAndName);
mediaRoute.get('/:id', getMedia);

// Delete route
mediaRoute.delete('/:id', uploadAuth, deleteMedia);

export default mediaRoute    
