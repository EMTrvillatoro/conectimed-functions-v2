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

console.log(`📌 Using Excel file: ${excelPath}`);
if (isDryRun) {
  console.log('🧪 DRY RUN MODE ENABLED - No Firebase CLI commands will be executed.');
}

// Read Excel file
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);

let successCount = 0;
let failCount = 0;
let totalProcessed = 0;

console.log(`\n🚀 Starting Firebase Functions v1 -> v2 Migration Deployment (${data.length} functions)\n`);

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const functionName = row.NAME;

  if (!functionName) {
    continue;
  }

  totalProcessed++;
  console.log(`--------------------------------------------------`);
  console.log(`[${totalProcessed}/${data.length}] Processing function: ${functionName}`);

  let deleteSuccess = false;
  let deploySuccess = false;

  // 1. Delete v1 function
  console.log(`  └─ 1. Deleting v1 function: ${functionName}...`);
  if (isDryRun) {
    console.log(`     [DRY RUN] Executed: firebase functions:delete ${functionName} --force`);
    deleteSuccess = true;
  } else {
    try {
      execSync(`npx firebase functions:delete ${functionName} --force`, {
        stdio: 'inherit',
        encoding: 'utf8'
      });
      deleteSuccess = true;
      console.log(`  ✅ Successfully deleted v1 function: ${functionName}`);
    } catch (err) {
      console.warn(`  ⚠️ Warning: Failed to delete function ${functionName} (it may not exist or CLI failed):`, err.message || err);
      // Continue to deploy step even if delete fails
    }
  }

  // 2. Deploy v2 function
  console.log(`  └─ 2. Deploying v2 function: ${functionName}...`);
  if (isDryRun) {
    console.log(`     [DRY RUN] Executed: firebase deploy --only functions:${functionName}`);
    deploySuccess = true;
  } else {
    try {
      execSync(`npx firebase deploy --only functions:${functionName}`, {
        stdio: 'inherit',
        encoding: 'utf8'
      });
      deploySuccess = true;
      console.log(`  ✅ Successfully deployed v2 function: ${functionName}`);
    } catch (err) {
      console.error(`  ❌ Error deploying v2 function ${functionName}:`, err.message || err);
      failCount++;
      // Continue to next function
      continue;
    }
  }

  // 3. Update Excel file column ENVIRONMENT to '2nd gen' upon successful deployment
  if (deploySuccess) {
    row.ENVIRONMENT = '2nd gen';
    successCount++;

    try {
      const updatedSheet = xlsx.utils.json_to_sheet(data);
      workbook.Sheets[sheetName] = updatedSheet;
      xlsx.writeFile(workbook, excelPath);
      console.log(`  📝 Excel updated: ${functionName} ENVIRONMENT set to '2nd gen'`);
    } catch (excelErr) {
      console.error(`  ⚠️ Warning: Failed to save updated Excel file:`, excelErr.message || excelErr);
    }
  }
}

console.log(`\n==================================================`);
console.log(`🎉 Migration Deployment Complete!`);
console.log(`📊 Summary:`);
console.log(`   - Total processed: ${totalProcessed}`);
console.log(`   - Successfully updated to 2nd gen: ${successCount}`);
console.log(`   - Failed: ${failCount}`);
console.log(`==================================================\n`);
