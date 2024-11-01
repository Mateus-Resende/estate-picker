function extractApartmentInfo() {
  const title = document.querySelector('.titulo-apartamento').innerText;
  const price = document.querySelector('.preco').innerText;
  const area = document.querySelector('.area').innerText;
  return [title, price, area]; // Formato de array para Google Sheets
}

function sendToSheet(sheetId, range) {
  const values = [extractApartmentInfo()]; // Array de valores para inserir
  chrome.runtime.sendMessage({
    action: 'writeToSheet',
    sheetId: sheetId,
    range: range,
    values: values
  });
}

// Funções para os botões
function addToBuySheet() {
  sendToSheet("SHEET_ID_COMPRAR", "Referência para compra - \"piores\"!A1");
}

function addToReferenceSheet() {
  sendToSheet("SHEET_ID_REFERENCIA", "Referência para venda - \"melhores\"!A1");
}
