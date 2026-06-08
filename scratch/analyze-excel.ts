import ExcelJS from "exceljs";

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("scratch/IGBC Green Existing Interiors data tables.xlsx");
  
  workbook.eachSheet((sheet, id) => {
    console.log(`Sheet [${id}]: ${sheet.name}`);
    sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum <= 5) {
         console.log(`  Row ${rowNum}:`, row.values);
      }
    });
    console.log("...");
  });
}

main().catch(console.error);
