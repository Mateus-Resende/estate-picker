// Inicializa o popup verificando se já há uma planilha configurada
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get("sheetId", (result) => {
    if (result.sheetId) {
      showActionButtons();  // Exibe as opções de adicionar e reconfigurar
    } else {
      showSetupForm();  // Mostra o formulário de configuração inicial
    }
  });
});

// Função para exibir o formulário de configuração
function showSetupForm() {
  document.getElementById('setup-section').style.display = 'block';
  document.getElementById('actions-section').style.display = 'none';

  document.getElementById('createSheet').addEventListener('click', () => {
    const sheetName = document.getElementById('sheetName').value;
    if (sheetName) {
      chrome.runtime.sendMessage({ action: 'createSheet', sheetName });
      alert('Planilha sendo criada. Verifique o Google Drive.');
      showActionButtons();  // Atualiza o popup para mostrar os botões de adicionar
    } else {
      alert('Por favor, insira um nome para a planilha.');
    }
  });
}

// Função para exibir os botões de adicionar e reconfigurar
function showActionButtons() {
  document.getElementById('setup-section').style.display = 'none';
  document.getElementById('actions-section').style.display = 'block';

  // Botão para adicionar à planilha de compras
  document.getElementById('addToBuy').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'addToBuy' });
  });

  // Botão para adicionar à planilha de referência
  document.getElementById('addToReference').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'addToReference' });
  });

  // Botão para reconfigurar e permitir criar nova planilha
  document.getElementById('reconfigure').addEventListener('click', () => {
    chrome.storage.sync.remove("sheetId", () => {
      showSetupForm();  // Mostra o formulário para configurar nova planilha
    });
  });
}
