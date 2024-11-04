async function authenticate() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

// Função para escrever dados na planilha Google Sheets
async function writeToSheet(sheetId, range, values) {
  const token = await authenticate();

  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  })
    .then(response => response.json())
    .then(data => console.log("Dados adicionados:", data))
    .catch(error => console.error("Erro ao escrever na planilha:", error));
}

async function getSheetId(spreadsheetId, sheetTitle) {
  const token = await authenticate();

  // Faz a requisição para obter as informações da planilha
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  // Procura o ID da aba com base no título
  const sheet = data.sheets.find(s => s.properties.title === sheetTitle);

  if (sheet) {
    return sheet.properties.sheetId;
  } else {
    throw new Error(`Aba com o título "${sheetTitle}" não encontrada.`);
  }
}

async function createNewSpreadsheet(newSheetName) {
  const token = await authenticate();

  // Cria uma nova planilha
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: newSheetName },
    }),
  });

  const data = await response.json();
  const newSpreadsheetId = data.spreadsheetId;
  console.log(`Nova planilha criada: https://docs.google.com/spreadsheets/d/${newSpreadsheetId}`);
  return newSpreadsheetId;
}

async function copySheetsToNewSpreadsheet(newSpreadsheetId) {
  const templateSheetId = '1PR_F5tCXB46zOPGBHJZ6KM4d_bNyAgaN9BZ7J-CZQP0'; // ID da sua planilha de template
  const token = await authenticate();

  // Define os títulos das abas que você deseja copiar
  const sheetsToCopy = [
    'Referência para compra - "piores"',
    'Referência para venda - "melhores"'
  ];

  // Copia as abas desejadas
  for (const sheetTitle of sheetsToCopy) {
    try {
      // Obtém o ID da aba no template usando o título
      const sheetId = await getSheetId(templateSheetId, sheetTitle);

      // Copia a aba do template para a nova planilha
      const copyResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${templateSheetId}/sheets/${sheetId}:copyTo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationSpreadsheetId: newSpreadsheetId,
        }),
      });

      if (copyResponse.ok) {
        console.log(`Aba "${sheetTitle}" copiada com sucesso para a nova planilha: https://docs.google.com/spreadsheets/d/${newSpreadsheetId}`);
      } else {
        const errorData = await copyResponse.json();
        console.error(`Erro ao copiar a aba "${sheetTitle}":`, errorData);
      }
    } catch (error) {
      console.error(`Erro ao obter o ID da aba "${sheetTitle}":`, error.message);
    }
  }

  // Remove abas que não pertencem ao template
  await removeExtraSheets(newSpreadsheetId, sheetsToCopy);
}

async function removeExtraSheets(spreadsheetId, sheetsToKeep) {
  const token = await authenticate();

  // Obtém todas as abas da nova planilha
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title,sheetId))`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  const existingSheets = data.sheets || [];

  // Filtra as abas que não estão na lista de abas que queremos manter
  const sheetsToRemove = existingSheets
    .filter(sheet => !sheetsToKeep.includes(sheet.properties.title))
    .map(sheet => sheet.properties.sheetId);

  // Prepara as solicitações de exclusão
  const requests = sheetsToRemove.map(sheetId => ({
    deleteSheet: {
      sheetId: sheetId,
    },
  }));

  // Executa as exclusões em uma única chamada batchUpdate
  if (requests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
    console.log(`Abas removidas: ${sheetsToRemove.join(', ')}`);
  } else {
    console.log('Nenhuma aba extra encontrada para remover.');
  }
}

function addEntryToSheet(action) {
  chrome.storage.sync.get("sheetId", async (result) => {
    if (result.sheetId) {
      const sheetId = result.sheetId;
      const tabName = action === 'addToBuy' ? 'Referência para compra - "piores"' : 'Referência para venda - "melhores"';

      // Código para adicionar informações na aba correspondente
      // Aqui você iria incluir o código para buscar as informações do apartamento e inseri-las na planilha
    }
  });
}

// Função que lista as planilhas do usuário e verifica se uma planilha com o nome já existe
async function findSpreadsheetByName(sheetName) {
  const token = await authenticate();
  
  // Faz a requisição para listar as planilhas do usuário
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets?fields=files(id,name)`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar planilhas: ' + response.statusText);
  }

  const data = await response.json();
  const spreadsheet = data.files.find(file => file.name === sheetName);
  
  return spreadsheet ? spreadsheet.id : null;
}

// Função para inicializar ou reutilizar a planilha
async function initializeSheet(sheetName) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get("sheetId", async (result) => {
      if (result.sheetId) {
        console.log("Usando planilha existente:", result.sheetId);
        resolve(result.sheetId); // Retorna o ID da planilha já configurada
      } else {
        try {
          // Procura uma planilha existente com o nome fornecido
          const existingSheetId = await findSpreadsheetByName(sheetName);
          
          if (existingSheetId) {
            console.log("Planilha existente encontrada:", existingSheetId);
            chrome.storage.sync.set({ sheetId: existingSheetId }, () => {
              resolve(existingSheetId);
            });
          } else {
            // Se não houver planilha existente, cria uma nova
            const newSpreadsheetId = await createNewSpreadsheet(sheetName);
            await copySheetsToNewSpreadsheet(newSpreadsheetId);
            
            // Salva o novo ID no armazenamento do Chrome
            chrome.storage.sync.set({ sheetId: newSpreadsheetId }, () => {
              console.log("Nova planilha criada e ID salvo:", newSpreadsheetId);
              resolve(newSpreadsheetId);
            });
          }
        } catch (error) {
          console.error("Erro ao configurar a planilha:", error.message);
          reject(error);
        }
      }
    });
  });
}


// Gerencia as mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createSheet') {
    const newSheetName = request.sheetName;

    initializeSheet(newSheetName)
      .then(sheetId => {
        console.log("Planilha configurada com sucesso:", sheetId);
      })
      .catch(error => console.error("Erro ao configurar a planilha:", error.message));
  } else if (request.action === 'addToBuy' || request.action === 'addToReference') {
    addEntryToSheet(request.action);
  } else if (request.action === 'writeToSheet') {
    const { sheetId, range, values } = request;
    writeToSheet(sheetId, range, values);
  }
});
