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
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message || 'Canvas API request failed';
            console.error('Canvas API fetch error:', error.response?.data || error.message);
            // Preserve status and message so upstream handlers can return accurate errors
            error.message = message;
            if (status) {
                error.status = status;
            }
            throw error;
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
        const now = new Date();

        // Window bounds
        const sevenDaysAhead = new Date(now);
        sevenDaysAhead.setDate(now.getDate() + 7);

        const twoDaysAgo = new Date(now);
        twoDaysAgo.setDate(now.getDate() - 2);

        const coursesWithAssignments = [];

        for (const course of courses) {
            const assignments = await this.getAssignments(course.canvasId);

            // Partition into keep vs. stale
            const keepAssignments = [];
            const staleAssignmentIds = []; // canvasIds of assignments to delete from DB

            for (const a of assignments) {
                if (!a.dueDate) {
                    // No due date — include it, don't delete
                    keepAssignments.push(a);
                    continue;
                }

                const due = new Date(a.dueDate);

                if (due >= now && due <= sevenDaysAhead) {
                    // Upcoming within the week ✅
                    keepAssignments.push(a);
                } else if (due >= twoDaysAgo && due < now) {
                    // Past due but within 2 days ✅
                    keepAssignments.push(a);
                } else if (due < twoDaysAgo) {
                    // Past due more than 2 days — mark for deletion ❌
                    staleAssignmentIds.push(a.canvasId);
                }
                // due > sevenDaysAhead: too far in the future, just exclude silently
            }

            coursesWithAssignments.push({
                ...course,
                assignments: keepAssignments,
                staleAssignmentIds, // pass this up to the controller
            });
        }

        return coursesWithAssignments;
    }


}

export default CanvasService;
