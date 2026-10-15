#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const xlsx = require('xlsx');

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

let excelPathArg = null;
const excelIdx = args.findIndex(a => a === '--excel' || a === '-e');
if (excelIdx !== -1 && args[excelIdx + 1]) {
  excelPathArg = args[excelIdx + 1];
}

// Find target Excel file
let excelPath = excelPathArg;
if (!excelPath) {
  const possiblePaths = [
    path.join(__dirname, '../functions.xlsx'),
    path.join(__dirname, '../../functions/functions.xlsx'),
    path.join(__dirname, '../../functions_v1/functions_v1.xlsx')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      excelPath = p;
      break;
    }
  }
}

if (!excelPath || !fs.existsSync(excelPath)) {
  console.error('❌ Error: Excel file not found. Specified path:', excelPath);
  process.exit(1);
}

const dirName = path.dirname(excelPath);
const historyLogPath = path.join(dirName, 'migration_history.log');
const historyJsonPath = path.join(dirName, 'migration_history.json');

function appendLog(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(historyLogPath, logLine, 'utf8');
  } catch (err) {
    console.error('Failed writing to log file:', err);
  }
}

function saveHistoryJson(entry) {
  let history = [];
  try {
    if (fs.existsSync(historyJsonPath)) {
      const content = fs.readFileSync(historyJsonPath, 'utf8');
      history = JSON.parse(content);
    }
  } catch (e) {
    history = [];
  }
  history.push(entry);
  try {
    fs.writeFileSync(historyJsonPath, JSON.stringify(history, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed saving history JSON:', e);
  }
}

appendLog(`📌 Using Excel file: ${excelPath}`);
if (isDryRun) {
  appendLog('🧪 DRY RUN MODE ENABLED - No Firebase CLI commands will be executed.');
}

// Read Excel file
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);

let successCount = 0;
let failCount = 0;
let totalProcessed = 0;

appendLog(`\n🚀 Starting Firebase Functions v1 -> v2 Migration Deployment (${data.length} functions)\n`);

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const functionName = row.NAME;

  if (!functionName) {
    continue;
  }

  totalProcessed++;
  const nowStr = new Date().toISOString();
  appendLog(`--------------------------------------------------`);
  appendLog(`[${totalProcessed}/${data.length}] Processing function: ${functionName}`);

  let deleteSuccess = false;
  let deploySuccess = false;
  let errorDetail = null;

  // 1. Delete v1 function
  appendLog(`  └─ 1. Deleting v1 function: ${functionName}...`);
  if (isDryRun) {
    appendLog(`     [DRY RUN] Executed: firebase functions:delete ${functionName} --force`);
    deleteSuccess = true;
  } else {
    try {
      execSync(`npx firebase functions:delete ${functionName} --force`, {
        stdio: 'inherit',
        encoding: 'utf8'
      });
      deleteSuccess = true;
      appendLog(`  ✅ Successfully deleted v1 function: ${functionName}`);
    } catch (err) {
      errorDetail = err.message || String(err);
      appendLog(`  ⚠️ Warning: Failed to delete function ${functionName} (it may not exist or CLI failed): ${errorDetail}`);
    }
  }

  // 2. Deploy v2 function
  appendLog(`  └─ 2. Deploying v2 function: ${functionName}...`);
  if (isDryRun) {
    appendLog(`     [DRY RUN] Executed: firebase deploy --only functions:${functionName}`);
    deploySuccess = true;
  } else {
    try {
      execSync(`npx firebase deploy --only functions:${functionName}`, {
        stdio: 'inherit',
        encoding: 'utf8'
      });
      deploySuccess = true;
      appendLog(`  ✅ Successfully deployed v2 function: ${functionName}`);
    } catch (err) {
      errorDetail = err.message || String(err);
      appendLog(`  ❌ Error deploying v2 function ${functionName}: ${errorDetail}`);
      row.STATUS = 'ERROR';
      row.ENVIRONMENT = row.ENVIRONMENT || '1st gen';
      row.LAST_DEPLOYED_AT = new Date().toISOString();
      failCount++;

      saveHistoryJson({
        timestamp: new Date().toISOString(),
        function: functionName,
        status: 'ERROR',
        deleteSuccess,
        deploySuccess: false,
        error: errorDetail
      });

      try {
        const updatedSheet = xlsx.utils.json_to_sheet(data);
        workbook.Sheets[sheetName] = updatedSheet;
        xlsx.writeFile(workbook, excelPath);
      } catch (e) {}

      continue;
    }
  }

  // 3. Update Excel file on success
  if (deploySuccess) {
    row.ENVIRONMENT = '2nd gen';
    row.STATUS = 'MIGRADO';
    row.LAST_DEPLOYED_AT = new Date().toISOString();
    successCount++;

    saveHistoryJson({
      timestamp: new Date().toISOString(),
      function: functionName,
      status: 'MIGRADO',
      deleteSuccess,
      deploySuccess: true,
      error: null
    });

    try {
      const updatedSheet = xlsx.utils.json_to_sheet(data);
      workbook.Sheets[sheetName] = updatedSheet;
      xlsx.writeFile(workbook, excelPath);
      appendLog(`  📝 Excel updated: ${functionName} STATUS set to 'MIGRADO' & ENVIRONMENT set to '2nd gen'`);
    } catch (excelErr) {
      appendLog(`  ⚠️ Warning: Failed to save updated Excel file: ${excelErr.message || excelErr}`);
    }
  }
}

appendLog(`\n==================================================`);
appendLog(`🎉 Migration Deployment Complete!`);
appendLog(`📊 Summary:`);
appendLog(`   - Total processed: ${totalProcessed}`);
appendLog(`   - Successfully migrated (2nd gen): ${successCount}`);
appendLog(`   - Errors: ${failCount}`);
appendLog(`   - History Log: ${historyLogPath}`);
appendLog(`   - History JSON: ${historyJsonPath}`);
appendLog(`==================================================\n`);
