import axios from 'axios';
import {admin} from "../config/firebase.js";

const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL || 'https://utampa.instructure.com/api/v1';


// create a CanvasService object that sends requests to the UT canvas API using your token
class CanvasService {
    constructor(canvasToken, canvasUrl = CANVAS_BASE_URL) {
        this.token = canvasToken;
        this.baseUrl = canvasUrl;
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
    }

    async fetchCanvasAPI(endpoint) {
        try {
            const response = await this.axiosInstance.get(endpoint);  // axios sends HTTP req
            return response.data;
        } catch (error) {
            console.error('Canvas API fetch error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Canvas API request failed');
        }
    }
}