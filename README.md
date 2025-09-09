![Living Meeple Banner](/images/living_meeple_header.png)

### 📜 Turn dense history into delightful, meeple-sized stories.

Living Meeple is an innovative AI-powered application designed to bridge the gap between dense historical texts and engaging learning experiences. It transforms dry historical accounts into simple, easy-to-digest visual storybooks, making history more accessible and fun for visual learners and younger audiences.

<a href="https://www.youtube.com/watch?v=9HNK1-bh2zY" title="Living Meeple Demo Video">
  <img src="https://img.youtube.com/vi/9HNK1-bh2zY/hqdefault.jpg" alt="Living Meeple Demo Video" width="600px" />
</a>

> Click the thumbnail above to watch a video demonstration of the project.

## The Problem

History is fascinating, but textbooks and historical documents are often presented in dense, text-heavy formats that can be daunting. The key events, troop movements, and strategic decisions can get lost in the narrative, making it difficult for many to comprehend and connect with the past.

## Our Solution: A Layered Storytelling Approach

Living Meeple's core innovation is its use of a "cell animation" or "layered" storytelling approach, made possible by the powerful image editing capabilities of Google's new Gemini models. Instead of attempting to generate a single, complex image from a massive prompt, it builds each scene step-by-step. This ensures a consistent and clear visual narrative, solving common problems in AI image generation like maintaining character and style consistency across multiple images.

This project was built for the **Kaggle Nano-Banana Competition**, leveraging Google's new Gemini models to orchestrate this entire process.

### <font color="#00a0a0">How It Works</font>

The process is analogous to a movie production pipeline, with different AI models playing specialized roles:

1.  <font color="#00a0a0">**The Director (Gemini 2.0 Flash)**</font>: You paste in a historical text. The `gemini-2.0-flash-lite` model acts as the Director, reading the text and creating a detailed `BattlePlan` in JSON format. This plan is a shot-list for our image model, breaking the narrative into a frame-by-frame storyboard and defining every visual element needed.

2.  <font color="#00a0a0">**The Art Department (Gemini 2.5 Flash Image Preview)**</font>: The application then acts as the Art Department, using the `gemini-2.5-flash-image-preview` model's image generation capabilities to create a consistent set of assets. This is where the Nano-Banana model's power shines:
    *   It designs unique meeple figures for each faction. **Crucially, these generated meeples are then used as reference images for all subsequent placements**, solving the difficult problem of character consistency across the story.
    *   It generates a base map by layering topographical features and landmarks, using a `cartography_style_guide.jpg` image as a style reference to ensure a uniform, kid-friendly art style.

3.  <font color="#00a0a0">**The Animator (Gemini 2.5 Flash Image Preview)**</font>: Finally, the application becomes the Animator. For each page in the storyboard, it uses the **image editing (in-painting) capabilities** of the `gemini-2.5-flash-image-preview` model to:
    *   Place the consistent meeple assets onto the map.
    *   Draw arrows to represent movements like charges or flanking maneuvers.
    *   Add labels for key locations.
    *   Each action is a new layer, building up to the final image for that page of the story.

The result is a clean, simple, and visually engaging storybook that makes history easier to grasp.

## <font color="#f39c12">The Challenges and Learnings</font>

The primary challenge in any multi-image AI project is maintaining visual consistency. Early AI image tools struggled to redraw the same character or maintain a coherent style from one image to the next. Our key learning was to leverage the new image editing and reference image capabilities of the Gemini 2.5 Flash model. By generating a base asset (like a meeple) once and then using it as a reference for in-painting, we could ensure our "characters" remained identical throughout the story.

A second, practical challenge was working within the API's free-tier rate limits (e.g., 10 requests per minute for the image model, 30 RPM for the text model). Our layered approach, while powerful, makes many sequential API calls. To solve this, we engineered a deliberate delay between each request, pacing the application to respect the API quotas. This highlights a real-world engineering consideration when building production-ready AI applications.

This project underscored the power of treating the AI not as a one-shot creator, but as a tool to be guided through a structured, layered workflow that respects both creative and technical constraints.

## For Local Developers

### Setup and Running

To get the Living Meeple project running on your local machine, follow these steps:

1.  **Prerequisites:** Make sure you have [Node.js](https://nodejs.org/) (version 18 or higher is recommended) and a package manager like `npm` or `yarn` installed.

2.  **Clone the Repository:**
    ```bash
    # Replace with your repository's URL
    git clone https://github.com/google-gemini/generative-ai-docs-samples.git
    cd generative-ai-docs-samples/demos/living-meeple
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Set Up Environment Variables:**
    The application requires a Google Gemini API key to function.
    *   Create a new file named `.env` in the root of the project directory.
    *   Add your Gemini API key to the `.env` file. You can get a key from Google AI Studio.
        ```
        GEMINI_API_KEY="your_api_key_here"
        ```

5.  **Run the Development Servers:**
    This project consists of two main parts: a Node.js/Express backend server for API calls and a React/Vite frontend for the user interface. You'll need to run them concurrently in two separate terminal windows.

    *   **Terminal 1: Start the Backend API Server**
        ```bash
        # This command starts the backend server, which handles requests to the Gemini API.
        # It will typically run on http://localhost:3001.
        npx ts-node-dev --respawn server.ts
        ```

    *   **Terminal 2: Start the Frontend Vite Server**
        ```bash
        # This command starts the frontend development server, typically on http://localhost:5173.
        npm run dev
        ```

6.  **Open the Application:**
    Open your web browser and navigate to the address for the frontend server (e.g., `http://localhost:5173`). You should now be able to use the Living Meeple application!

### Debugging and Generated Files

When you run this project locally, it creates a `/tmp` directory in the project root to aid in debugging and development. This directory contains:

*   **Generated Images**: All images created during the process, including base maps, map layers, meeples, and the final composited storyboard frames.
*   **API Call Logs**: For each call to the Gemini API, a pair of JSON files are saved, named with a SHA256 hash of their content. The UI debug log will show you the exact filenames for each request, allowing you to inspect the raw request sent to the model and the raw response received.
*   **Session Debug Log**: A timestamped log file (e.g., `debug-2024-10-27_14-30-05.log`) that contains the complete, human-readable log for the entire story generation session. The UI's "Debug Log" tab mirrors this content.

This allows you to trace the entire generation process, inspect the data at each step, and easily debug any issues with planning or image generation.

## Technology Stack

*   **Frontend**: React, TypeScript
*   **Backend**: Node.js, Express
*   **AI Planning Model**: Google Gemini 2.0 Flash (`gemini-2.0-flash-lite`)
*   **AI Image Generation & Editing Model**: Google Gemini 2.5 Flash Image Preview (`gemini-2.5-flash-image-preview`)
*   **Future Work**: Integration with ElevenLabs for AI-powered audio narration of the story.

---

## <font color="#00a0a0">🏆 About the Nano-Banana Hackathon</font>

This project was developed for the Kaggle Nano-Banana Competition to showcase the new **Gemini 2.5 Flash Image Preview** model's advanced capabilities. The core of Living Meeple is its demonstration of:
*   **Image Editing & In-painting**: Building complex scenes layer-by-layer.
*   **Style Consistency**: Using a reference image to guide the artistic style of the maps.
*   **Character Consistency**: Generating a character asset (a meeple) once and using it as a reference to solve a classic AI image problem.

The **Gemini 2.0 Flash** model plays the critical supporting role of the "Director," deconstructing unstructured text into a precise, machine-readable `BattlePlan`. This plan is what enables the highly-controlled, step-by-step use of the image model, demonstrating a powerful, multi-modal AI workflow.