# Conectimed Functions

This project utilizes Cloud Functions for Firebase (2nd gen) to extend the functionality of our Firebase application, leveraging the power of Cloud Run and Eventarc for enhanced performance and scalability.

## Getting Started

### Prerequisites

*   Node.js (LTS recommended)
*   npm or yarn
*   Firebase CLI: `npm install -g firebase-cli`

### Project Setup

1.  Initialize your Firebase project: `firebase init functions`
2.  Navigate to the `functions` directory: `cd functions`
3.  Install dependencies: `npm install`

# 🧑‍💻 Writing Functions

Here's an example of an HTTP function written in JavaScript using Firebase Functions v2:

```javascript
const { onRequest } = require('firebase-functions/v2/https');

exports.helloWorld = onRequest((req, res) => {
  res.send("Hello from Firebase Functions v2!");
});
