import { JobManagerControllerHandlers } from '../generated/jobmanager/JobManagerController';

/**
 * Controller for handling incoming messages via gRPC - based on the PROTO file
 */
const JobManagerController: JobManagerControllerHandlers = {
    createNewJob: async (call, callback) => {
        const { request } = call;
    },
    getAllJobs: async (call, callback) => {
        const { request } = call;
    },
    getAllJobsInProgress: async (call, callback) => {
        const { request } = call;
    },
    deleteJobAndAllData: async (call, callback) => {
        const { request } = call;
    },
    getAvailableSources: async (call, callback) => {
        const { request } = call;
    },
    startScanningJob: async (call, callback) => {
        const { request } = call;
    },
};

export default JobManagerController;
