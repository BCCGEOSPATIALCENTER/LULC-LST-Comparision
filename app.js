/* =========================================================
   CONFIGURATION
   ========================================================= */

const API_MODE = "DUMMY";

// Later:
//
// const API_BASE_URL = "https://your-api-domain.com/api/lst";



/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const cityDropdown =
    document.getElementById("cityDropdown");

const startDate =
    document.getElementById("startDate");

const endDate =
    document.getElementById("endDate");

const enterButton =
    document.getElementById("enterButton");

const errorMessage =
    document.getElementById("errorMessage");

const loadingMessage =
    document.getElementById("loadingMessage");

const resultStatus =
    document.getElementById("resultStatus");

const dateButtons =
    document.getElementById("dateButtons");

const lstImage =
    document.getElementById("lstImage");

const imagePlaceholder =
    document.getElementById("imagePlaceholder");

const csvButton =
    document.getElementById("csvButton");

const graph1 =
    document.getElementById("graph1");

const graph2 =
    document.getElementById("graph2");

const graph1Placeholder =
    document.getElementById("graph1Placeholder");

const graph2Placeholder =
    document.getElementById("graph2Placeholder");



/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        await loadCities();

    } catch (error) {

        showError(
            "Unable to load available cities."
        );

        console.error(error);

    }

}



/* =========================================================
   CITY API
   ========================================================= */

async function loadCities() {

    let response;


    if (API_MODE === "DUMMY") {

        response =
            await dummyGetCities();

    } else {

        response =
            await fetch(
                `${API_BASE_URL}/cities`
            );

        response =
            await response.json();

    }


    cityDropdown.innerHTML =
        '<option value="">Select city</option>';


    response.cities.forEach(city => {

        const option =
            document.createElement("option");

        option.value = city.id;

        option.textContent = city.name;

        cityDropdown.appendChild(option);

    });

}



/* =========================================================
   ENTER BUTTON
   ========================================================= */

enterButton.addEventListener(
    "click",
    handleSubmit
);


async function handleSubmit() {

    clearError();


    const city =
        cityDropdown.value;

    const start =
        startDate.value;

    const end =
        endDate.value;



    /* -------------------------
       VALIDATION
       ------------------------- */

    if (!city) {

        showError(
            "Please select a city."
        );

        return;

    }


    if (!start) {

        showError(
            "Please select a start date."
        );

        return;

    }


    if (!end) {

        showError(
            "Please select an end date."
        );

        return;

    }


    if (end < start) {

        showError(
            "End date cannot be before start date."
        );

        return;

    }



    /* -------------------------
       START PROCESSING
       ------------------------- */

    setLoading(true);


    try {

        /*
         * STEP 1
         *
         * Create processing job
         */

        const job =
            await createJob(
                city,
                start,
                end
            );


        /*
         * STEP 2
         *
         * Wait for processing
         *
         * Dummy API completes immediately.
         * Real API will poll status.
         */

        const completedJob =
            await waitForJob(
                job.job_id
            );


        /*
         * STEP 3
         *
         * Retrieve results
         */

        const results =
            await getResults(
                completedJob.job_id,
                city
            );


        /*
         * STEP 4
         *
         * Display results
         */

        displayResults(results);


    } catch (error) {

        console.error(error);

        showError(
            "An error occurred while processing the request."
        );

    } finally {

        setLoading(false);

    }

}



/* =========================================================
   CREATE JOB
   ========================================================= */

async function createJob(
    city,
    start,
    end
) {

    if (API_MODE === "DUMMY") {

        return dummyCreateJob(
            city,
            start,
            end
        );

    }


    const response =
        await fetch(
            `${API_BASE_URL}/jobs`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    area: city,

                    start_date: start,

                    end_date: end

                })

            }
        );


    if (!response.ok) {

        throw new Error(
            "Unable to create job."
        );

    }


    return response.json();

}



/* =========================================================
   WAIT FOR JOB
   ========================================================= */

async function waitForJob(jobId) {

    if (API_MODE === "DUMMY") {

        return dummyGetJobStatus(jobId);

    }


    while (true) {

        const response =
            await fetch(
                `${API_BASE_URL}/jobs/${jobId}`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to retrieve job status."
            );

        }


        const job =
            await response.json();


        if (job.status === "completed") {

            return job;

        }


        if (job.status === "failed") {

            throw new Error(
                "LST processing failed."
            );

        }


        /*
         * Wait 2 seconds before checking again
         */

        await sleep(2000);

    }

}



/* =========================================================
   GET RESULTS
   ========================================================= */

async function getResults(jobId, city) {

    if (API_MODE === "DUMMY") {

        return dummyGetResults(jobId, city);

    }


    const response =
        await fetch(
            `${API_BASE_URL}/jobs/${jobId}/results`
        );


    if (!response.ok) {

        throw new Error(
            "Unable to retrieve results."
        );

    }


    return response.json();

}



/* =========================================================
   DISPLAY RESULTS
   ========================================================= */

function displayResults(results) {

    resultStatus.textContent =
        `${results.city_name} | ` +
        `${results.start_date} → ${results.end_date}`;


    /*
     * DATE BUTTONS
     */

    dateButtons.innerHTML = "";


    results.images.forEach(
        (imageData, index) => {

            const button =
                document.createElement("button");

            button.className =
                "date-button";


            button.textContent =
                formatDate(
                    imageData.date
                );


            button.addEventListener(
                "click",
                () => {

                    selectImage(
                        imageData,
                        button
                    );

                }
            );


            dateButtons.appendChild(button);


            /*
             * Automatically select
             * first image
             */

            if (index === 0) {

                selectImage(
                    imageData,
                    button
                );

            }

        }
    );


    /*
     * CSV
     */

    if (results.csv_url) {

        csvButton.href =
            results.csv_url;

        csvButton.classList.remove(
            "disabled"
        );

    }


    /*
     * GRAPH 1
     */

    if (results.graphs?.temperature_comparison) {

        graph1.src =
            results.graphs.temperature_comparison;

        graph1.classList.remove(
            "hidden"
        );

        graph1Placeholder.classList.add(
            "hidden"
        );

    }


    /*
     * GRAPH 2
     */

    if (results.graphs?.lst_temperature_difference) {

        graph2.src =
            results.graphs.lst_temperature_difference;

        graph2.classList.remove(
            "hidden"
        );

        graph2Placeholder.classList.add(
            "hidden"
        );

    }

}



/* =========================================================
   IMAGE SELECTION
   ========================================================= */

function selectImage(
    imageData,
    selectedButton
) {

    lstImage.src =
        imageData.image_url;


    lstImage.classList.remove(
        "hidden"
    );


    imagePlaceholder.classList.add(
        "hidden"
    );


    /*
     * Remove active state
     * from all buttons
     */

    document
        .querySelectorAll(".date-button")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });


    selectedButton.classList.add(
        "active"
    );

}



/* =========================================================
   LOADING
   ========================================================= */

function setLoading(isLoading) {

    if (isLoading) {

        enterButton.disabled =
            true;

        loadingMessage.classList.remove(
            "hidden"
        );

        resultStatus.textContent =
            "Processing...";

    } else {

        enterButton.disabled =
            false;

        loadingMessage.classList.add(
            "hidden"
        );

    }

}



/* =========================================================
   ERROR
   ========================================================= */

function showError(message) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );

}


function clearError() {

    errorMessage.textContent = "";

    errorMessage.classList.add(
        "hidden"
    );

}



/* =========================================================
   UTILITY
   ========================================================= */

function sleep(ms) {

    return new Promise(
        resolve => setTimeout(
            resolve,
            ms
        )
    );

}


function formatDate(dateString) {

    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}



/* =========================================================
   DUMMY API
   ========================================================= */


/*
 * GET /api/lst/cities
 */

async function dummyGetCities() {

    await sleep(300);


    return {

        cities: [

            {
                id: "manhattan",
                name: "Manhattan"
            },

            {
                id: "queens",
                name: "Queens"
            }

        ]

    };

}



/*
 * POST /api/lst/jobs
 */

async function dummyCreateJob(
    city,
    start,
    end
) {

    await sleep(500);


    return {

        job_id:
            "demo-job-001",

        status:
            "processing",

        city:
            city,

        start_date:
            start,

        end_date:
            end

    };

}



/*
 * GET /api/lst/jobs/{job_id}
 */

async function dummyGetJobStatus(
    jobId
) {

    await sleep(1000);


    return {

        job_id:
            jobId,

        status:
            "completed"

    };

}



/*
 * GET /api/lst/jobs/{job_id}/results
 */

async function dummyGetResults(jobId, city) {

    await sleep(500);


    return {

        job_id:
            jobId,

        city_name:
            city === "queens"
                ? "Queens"
                : "Manhattan",

        start_date:
            "2020-08-01",

        end_date:
            "2020-08-31",


        /*
         * Multiple images.
         *
         * For now we're using
         * public demo images.
         */

        images: [

            {
                date: "2020-08-03",

                image_url:
                    "https://placehold.co/1200x700/png?text=LST+Image+2020-08-03"
            },

            {
                date: "2020-08-11",

                image_url:
                    "https://placehold.co/1200x700/png?text=LST+Image+2020-08-11"
            },

            {
                date: "2020-08-19",

                image_url:
                    "https://placehold.co/1200x700/png?text=LST+Image+2020-08-19"
            },

            {
                date: "2020-08-27",

                image_url:
                    "https://placehold.co/1200x700/png?text=LST+Image+2020-08-27"
            }

        ],


        /*
         * Dummy CSV
         */

        csv_url:
            "https://example.com/dummy-lst-results.csv",


        /*
         * Dummy graphs
         */

        graphs: {

            temperature_comparison:
                "https://placehold.co/1200x600/png?text=Temperature+Comparison",

            lst_temperature_difference:
                "https://placehold.co/1200x600/png?text=LST+Temperature+Difference"

        }

    };

}