![Image Scanner Logo](images/logo.png)

# Image Scanner

### By Leon Baird

This is an experimental software demonstrator. It shows how a system can be built to scan and process images and other
media through a variety of enrichment and data extraction stages. A main job manager scans for data, extracts basic
metadata and security hashes from images, and then passes them to microservices designed to extract additional
information. The main job manager stores all data in a PostgreSQL database and provides a UI to visualize and search the
extracted data. Designed for use in **forensic investigations**.

Services communicate via **RabbitMQ** for image-processing messages, **REST** for the frontend interface, and **gRPC**
for control and management of connected services.

This project supports **Linux** and **macOS**, but may require additional work to run on **Windows** (not tested).

---

## 🚀 Getting Started

To get the system running quickly:

```bash
# Clone the repository
git clone https://github.com/GLBaird/image-scanner.git
cd image-scanner

# Update proto files
./update_proto.sh

# Build and start with Docker
docker compose build
docker compose up
```

Once running, open [http://localhost:3000](http://localhost:3000) to access the web UI.

---

## Services Provided in the Project

| Service Name              | Description                                                                                                                                                     | Language |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **service-jobs**          | Main job manager service. Manages users, creates, runs, and deletes jobs. Performs scans of media stores and manages storing and updating data in the database. | NodeTS   |
| **service-exif**          | Extracts EXIF data from media. (CPU only)                                                                                                                       | NodeTS   |
| **service-faces**         | Extracts face hashes and bounding boxes from media. (CPU only)                                                                                                  | Python   |
| **service-classify**      | Extracts descriptive tags or captions from images. (GPU or CPU)                                                                                                 | Python   |
| **service-shared**        | Shared source code used between all NodeTS services for data extraction.                                                                                        | NodeTS   |
| **service_python_shared** | Shared source code used between all Python services for data extraction.                                                                                        | Python   |

---

## Building and Running the Project

When you have cloned the source code, prepare the project for building.

### 1. Clone Protos into Build Folders

```bash
./update_proto.sh
```

### 2. Install Docker

If you don’t have Docker installed, follow the [official instructions](https://docs.docker.com/engine/install/) for your
platform.

### 3. Pull Required Docker Images

```bash
docker compose pull
```

### 4. Build Docker Images

```bash
docker compose build
```

### 5. Update Docker Compose File with Environment Variables

In `docker-compose.yaml`, for the frontend service, add the following environment variables if you want to support user
sign-up/sign-in via **GitHub** or **Google**.  
You’ll need to set up OAuth apps with GitHub and Google, and copy the IDs and secrets here:

```
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

The frontend uses **Auth.js**. You may change `AUTH_SECRET` for a unique value (recommended for production).  
See the Auth.js documentation for details.

Also, update credentials for RabbitMQ and PostgreSQL (username and password) as needed if you are securing the system.

---

### 6. Set Up Image Source Folder

In `docker-compose.yaml`, under `service_jobs`, specify the path to the source folder containing the media you wish to
scan.

The default (Git-ignored) folder is:

```yaml
volumes:
    - ./service-jobs/sources:/app/sources # mount drives or folders to scan for source images
```

The web-based UI will show all subfolders inside this folder as selectable sources and will perform a deep hierarchical
scan when running a job.

---

### 7. Choose Concurrency

In `docker-compose.yaml`, environment variables control how many parallel jobs can run at once.

By default, all services run on CPU, so machine-learning stages can be slow.  
If you configure GPU support, processing will be faster and you can increase concurrency.

If running on CPU, start with low values for reliability.  
Default recommended starting value: **8**  
Maximum (on powerful multi-core CPUs): **20**

If set too high, services may crash during intense image processing.

**RABBIT_MQ_PREFETCH_LIMIT** — how many messages to fetch and process in parallel.

Used by the following services:

-   service-exif
-   service-faces
-   service-classify
-   service-jobs

---

### 8. Run Services

```bash
docker compose up
```

---

### Dealing with Build Errors

If a service fails to build, this is often due to dependency updates or deprecated versions.  
Check the Docker build logs and adjust the relevant `Dockerfile`.

Some build issues may be platform-specific (macOS vs Linux).  
Windows is **not tested**.

If a particular service fails, try building it individually:

```bash
docker compose build service_faces
```

---

## Running the UI

### Web Interfaces

| URL                 | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| **localhost:3000**  | Main Image Scanner UI                                                     |
| **localhost:5555**  | Prisma Studio (if running; can be launched in a container or on the host) |
| **localhost:15672** | RabbitMQ Management Console                                               |

---

### Signing In or Creating an Account

Open [localhost:3000](http://localhost:3000) in your browser (tested with Chrome).

If you’ve configured Google or GitHub OAuth, you can sign in via those platforms.  
Otherwise, create an account with email and password first.

![Account screenshots](images/accounts.png)

After signing in, you’ll see the main dashboard:

![Main Dashboard Welcome Screen](images/Welcome.png)

---

### Signing Out

If you’re using OAuth, you may see your custom avatar at the top-right of the page.  
Otherwise, a generic user icon will appear.  
Click the avatar to sign out and end your session.

![Sign Out](images/sign-out.png)

---

### User Management

Currently, the Users tab supports **deleting users**.

![User Management Tab](images/users-tab.png)

---

### Managing Jobs

From the Jobs tab, you can create and manage scanning jobs:

![Empty Job Manager](images/Jobs-Empty.png)

Press the **(+)** button on the “Current Jobs” bar to add a new job, select a source folder, and enter job details:

![Create New Job Example](images/jobs-create.png)

You can create multiple jobs, but it’s recommended to run one at a time for stability.  
Job status icons show progress:

-   Empty = not started
-   Orange = running
-   Green = complete

Use the **Play** button to start scanning for media (JPEG and PNG).  
The **Gallery** icon opens the image gallery to view extracted data.

![Empty Job Status](images/jobs-empty-status.png)

Below is an example of a job where file scanning is complete (green) and data extraction is in progress (orange):

![Progress Job Status](images/jobs-status-progress.png)

---

### Job Progress View

When you start a job, you’ll automatically enter the progress view.  
First, you’ll see live updates as files are discovered:

![Progress File Scan](images/progress-file-scan.png)

Once file scanning completes, the progress view will show all running services and their progress on the discovered
images:

![Progress Data Extraction](images/progress-data-extraction.png)

**Note:**  
There is a known issue where refreshing the browser during a scan can temporarily hide progress updates.  
The scan itself continues unaffected.

After completion, you can view the gallery or delete the job to remove its data.  
If the same media is scanned twice, the MD5 hash ensures it is not reprocessed, avoiding duplicate work.

---

### Image Gallery

Once extraction is complete, open the gallery to view images and their associated data.  
Use the image icon on the Jobs tab.

![Image Gallery](images/Gallery.png)

Adjust image size using the top-right slider.  
Click any image to view its extracted metadata.

![Image Gallery Selected Image](images/gallery-selected.png)

The left-hand pane shows categories of extracted data:

-   Basic Image Info
-   EXIF and Metadata
-   Location Information
-   Faces

![Gallery Info Panes](images/gallery-panels.png)

You can also toggle face bounding boxes by selecting **Image Faces** under the **Faces** section:

![Gallery Faces in main images](images/gallery-faces.png)

Click **Dashboard** at the top of the left-hand pane to return to the main view.

---

## Adding Additional Data Extraction Stages

You can build new data extraction stages in any language, as long as they connect to RabbitMQ and communicate with the
Job Manager.

This project includes templates:

-   **NodeTS template:** `service-exif`
-   **Python template:** `service-classify`

Once your new service is ready, add it to the Docker Compose file to run it with the stack.

Then register it in: `service-jobs/src/configs/stages_data.ts`

Example entry in `stages_data.ts`:

```ts
Classifier: {
    async streamImagesForProcessing(
        jobId: string,
        corrId: string,
        callback: ImageCallback,
        batchSize: number,
    ) {
        logger.info(
            `Streaming data for ${jobId} for classification processing in batches of ${batchSize}`,
            { id: 'StageDataHandler/Classifier/stream', corrId },
        );
        await streamImageDataForClassificationProcessing(jobId, batchSize, callback);
    },
    addDataToStore(incomingData: DataBlock) {
        const { md5, data, corrId, message, receiver } = incomingData;
        logger.debug(`Adding data to store for classifications for image md5: ${md5}`, {
            id: 'StageDataHandler/Classifier/store',
            corrId,
        });
        addClassifyDataFromProcessing(md5, data, corrId, message, receiver);
    },
    async count(jobId: string, corrId: string) {
        const count = await countNumberOfTasksForClassificationProcessing(jobId);
        logger.debug(`Counted ${count} tasks for classification on job: ${jobId}`, {
            id: 'StageDataHandler/Classifier/count',
            corrId,
        });
        return count;
    },
} as StageHandler,
```

You will also need to add your data to the DB via the Prisma Schema: `service-jobs/prisma/schema.prisma` and add
Data-Access methods following the patters found for the other services in `service-jobs/src/data-access`.
