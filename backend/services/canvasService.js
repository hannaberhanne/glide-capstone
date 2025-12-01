import axios from 'axios';

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

    async getCourses() {
        const courses = await this.fetchCanvasAPI('/courses?enrollment_state=active&per_page=100');

        return courses.map(course => ({
            canvasId: course.id?.toString() || '',
            title: course.name || '',
            courseCode: course.course_code || '',
            canvasUrl: course.html_url || '',
            instructor: '',  // Canvas API doesn't always provide this in course list
            meetingTimes: '',
            semester: '',
            syllabus: course.syllabus_body || '',
            grade: 0,
            targetGrade: 100,
            isActive: true,
        }));
    }

    async getAssignments(courseId) {
        const assignments = await this.fetchCanvasAPI(
            `/courses/${courseId}/assignments?per_page=100`
        );

        return assignments.map(assignment => ({
            canvasId: assignment.id?.toString() || '',
            title: assignment.name || '',
            description: assignment.description || '',
            dueDate: assignment.due_at || '',
            totalPoints: assignment.points_possible || 0,
            canvasUrl: assignment.html_url || '',
            completed: false,
        }));
    }

    async getCoursesWithAssignments() {
        const courses = await this.getCourses();

        const coursesWithAssignments = [];  // array

        for (const course of courses) {
            const assignments = await this.getAssignments(course.canvasId);

            coursesWithAssignments.push({
                ...course,
                assignments
            });
        }

        return coursesWithAssignments;
    }

}

export default CanvasService;