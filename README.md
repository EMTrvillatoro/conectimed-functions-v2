# Conectimed Functions V2

Este proyecto utiliza Cloud Functions para Firebase (segunda generación) para ampliar la funcionalidad de nuestra aplicación Firebase, aprovechando el poder de Cloud Run para mejorar el rendimiento y la escalabilidad.

## Getting Started

### Prerequisites

*   Node.js (LTS recommended)
*   npm or yarn
*   Firebase CLI: `npm install -g firebase-cli`

### Project Setup

1.  Initialize your Firebase project: `firebase init functions`
2.  Navigate to the `functions` directory: `cd functions`
3.  Install dependencies: `npm install`

## 📁 Project Structure

```
functions/
├── .gitignore            # Ignored files in Git
├── index.js              # Main entry point that exports all cloud functions
├── package-lock.json     # Lock file for npm
├── package.json          # Function-specific dependencies and scripts
.firebaserc           # Firebase project configuration
.gitignore            # Root-level ignore rules
firebase-debug.log    # Emulator debug logs
firebase.json         # Firebase services configuration
package.json          # Root dependencies (if used)
README.md             # Project documentation (this file)
```

# 🧑‍💻 Writing Functions

Here's an example of an HTTP function written in JavaScript using Firebase Functions v2:

```javascript
const { onRequest } = require('firebase-functions/v2/https');

exports.helloWorld = onRequest((req, res) => {
  res.send("Hello from Firebase Functions v2!");
});
