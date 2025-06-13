import { updateJobProgress } from '../data-access/Job';
import ProgressStore from '../data-access/ProgressStore';
import pause from '../../tests/helpers/pause';

export default async function runDataExtraction(jobId: string) {
    // TODO: add stages for additional data extraction

    const pStore = ProgressStore.get();

    // make example stage for testing UI updates
    const stage = 'example-stage';
    pStore.startNewStage(jobId, stage, 100);
    for (let i = 0; i < 100; i += 1) {
        await pause(100);
        pStore.updateForStage(jobId, stage, `/source/file$_{i}.jpg`);
    }

    // Mark all work as done
    await updateJobProgress(jobId, false, true);
}
