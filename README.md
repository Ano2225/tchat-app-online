# 💬 Tchat_Online

Tchat_Online is a real-time chat application that lets you exchange messages in **discussion channels**, **privately**, and share **images and videos**.

---

## ✨ Key Features

* **Real-time Chat:** Instant conversations between users.
* **Discussion Channels:** Participate in group discussions.
* **Private Messages:** Chat one-on-one with other users.
* **Media Sharing:** Send photos and videos directly in the chat.
* **Online Status:** See who's available to chat.
* **Message History:** Easily retrieve your past discussions.

---

## 🛠️ Technologies

* **Frontend:** Next.js, React, Tailwind CSS, Axios, Socket.IO Client, Zustand.
* **Backend:** Node.js, Express.js, Socket.IO, MongoDB, Mongoose.
* **Media Storage:** Cloudinary.

---

## 🚀 How to Use (Locally)

### 1. Prerequisites

Make sure you have:
* **Node.js** (v18 or higher recommended)
* **npm** or **Yarn**
* A **MongoDB** instance (local or Cloud Atlas)
* A **Cloudinary** account

### 2. Backend Setup

* Navigate to your backend folder (e.g., `cd backend`).
* Install dependencies: `npm install`
* Create a `.env` file at the root of the backend folder and add your environment variables (port, MongoDB connection string, JWT secret, Cloudinary keys).
* Start the server: `npm start` (or your specific start command).

### 3. Frontend Setup

* Navigate to your frontend folder (e.g., `cd frontend` or the project root).
* Install dependencies: `npm install`
* Start the Next.js application: `npm run dev`

The application will be accessible at `http://localhost:3000`.

---

## ⚙️ Important Development Configuration

* **`next.config.js`:** Ensure the `res.cloudinary.com` domain is added to the `images.domains` section for images to display correctly. Also, make sure the `rewrites` rule for `/api` is configured to proxy requests to your backend.
* **`src/utils/axiosInstance.js`:** Verify that the `baseURL` is set to `/api` for proper communication between the Next.js frontend and the backend.

---

## 🤝 Contribution

Contributions are welcome! Feel free to open issues or submit pull requests.
