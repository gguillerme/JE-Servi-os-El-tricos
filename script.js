document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURAÇÃO E ELEMENTOS ---
    const form = {
        nomeCliente: document.getElementById('nomeCliente'),
        cpfCliente: document.getElementById('cpfCliente'),
        cnpjCliente: document.getElementById('cnpjCliente'),
        servico: document.getElementById('servicoPrestado'),
        valor: document.getElementById('valor'),
        data: document.getElementById('dataServico')
    };
    
    const reciboPreview = document.getElementById('reciboPreview');
    const notificationContainer = document.getElementById('notification-container');

    // Dados padrão da pousada
    const defaultPousadaInfo = {
        nome: "POUSADA PARADISE",
        cpf: "639.412.440-00",
        responsavel: "Maurino Sabino",
        whatsapp: "(53) 98102-4424",
        endereco: "R. Duque de Caxias, 530 - Centro, Rio Grande - RS, 96200-020",
        logo: "logo.png"
    };
    
    // Carrega os dados da pousada do localStorage ou usa o padrão
    let pousadaInfo = JSON.parse(localStorage.getItem('pousadaInfo')) || defaultPousadaInfo;

    // --- 2. MÁSCARAS DE INPUT (IMask.js) ---
    const masks = {
        cpf: IMask(form.cpfCliente, { mask: '000.000.000-00' }),
        cnpj: IMask(form.cnpjCliente, { mask: '00.000.000/0000-00' }),
        valor: IMask(form.valor, {
            mask: 'R$ num',
            blocks: {
                num: {
                    mask: Number,
                    scale: 2,
                    thousandsSeparator: '.',
                    padFractionalZeros: true,
                    radix: ','
                }
            }
        })
    };

    // --- 3. SISTEMA DE NOTIFICAÇÃO ---
    function showNotification(message, type = 'error') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000); // A notificação some após 4 segundos
    }
    
    // --- 4. LÓGICA DO RECIBO ---
    function getFormData() {
        const dataInput = form.data.value;
        const dataObj = new Date(dataInput + 'T00:00:00');
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        
        return {
            nome: form.nomeCliente.value.trim(),
            cpf: masks.cpf.unmaskedValue,
            cnpj: masks.cnpj.unmaskedValue,
            servico: form.servico.value.trim(),
            valor: masks.valor.unmaskedValue, // Pega o valor numérico puro
            data: dataFormatada
        };
    }

    function createReciboHTML(data) {
        let clienteInfo = data.nome;
        if (data.cpf) clienteInfo += ` (CPF: ${masks.cpf.value})`;
        if (data.cnpj) clienteInfo += ` (CNPJ: ${masks.cnpj.value})`;
        
        // Formata o valor para exibição
        const valorFormatado = parseFloat(data.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        return `
            <div class="recibo">
                <div class="recibo-header">
                    <img src="${pousadaInfo.logo}" alt="Logo da Pousada Paradise">
                    <h2>Recibo de Pagamento</h2>
                </div>
                <p><strong>Emitente:</strong> ${pousadaInfo.nome}</p>
                <p><strong>CPF:</strong> ${pousadaInfo.cpf}</p>
                <p><strong>Responsável:</strong> ${pousadaInfo.responsavel}</p>
                <p><strong>Whatsapp:</strong> ${pousadaInfo.whatsapp}</p>
                <p><strong>Endereço:</strong> ${pousadaInfo.endereco}</p>
                <p><strong>Data de Emissão:</strong> ${data.data}</p>
                <hr class="recibo-line">
                <p><strong>Recebido de:</strong> ${clienteInfo}</p>
                <p><strong>Descrição do Serviço:</strong> ${data.servico}</p>
                <p><strong>Valor Recebido:</strong> ${valorFormatado}</p>
            </div>
        `;
    }

    function validateForm() {
        if (!form.nomeCliente.value || !form.servico.value || !masks.valor.unmaskedValue || !form.data.value) {
            showNotification('Por favor, preencha todos os campos obrigatórios.');
            return false;
        }
        if (parseFloat(masks.valor.unmaskedValue) <= 0) {
            showNotification('O valor deve ser maior que zero.');
            return false;
        }
        return true;
    }

    document.getElementById('btnVisualizar').addEventListener('click', () => {
        if (!validateForm()) return;
        
        const data = getFormData();
        reciboPreview.innerHTML = createReciboHTML(data);
        reciboPreview.style.display = 'block';
    });

    document.getElementById('btnGerarPDF').addEventListener('click', () => {
        if (!validateForm()) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const data = getFormData();
        const valorFormatadoPDF = parseFloat(data.valor).toFixed(2).replace('.', ',');

        const logo = new Image();
        logo.src = pousadaInfo.logo;
        logo.onload = function() {
            doc.addImage(logo, 'PNG', 85, 10, 40, 24);
            doc.setFontSize(18);
            doc.text("RECIBO DE PAGAMENTO", 105, 45, { align: "center" });
            doc.setFontSize(11);
            doc.text(`Emitente: ${pousadaInfo.nome}`, 20, 60);
            doc.text(`Responsável: ${pousadaInfo.responsavel} (CPF: ${pousadaInfo.cpf})`, 20, 68);
            doc.text(`Contato: ${pousadaInfo.whatsapp}`, 20, 76);
            doc.text(`Endereço: ${pousadaInfo.endereco}`, 20, 84);
            doc.text(`Data: ${data.data}`, 20, 92);
            doc.setLineWidth(0.2);
            doc.line(20, 100, 190, 100);
            
            let clienteInfo = data.nome;
            if (data.cpf) clienteInfo += ` (CPF: ${masks.cpf.value})`;
            if (data.cnpj) clienteInfo += ` (CNPJ: ${masks.cnpj.value})`;
            
            doc.text(`Recebido de: ${clienteInfo}`, 20, 110);
            doc.text(`Descrição do Serviço: ${data.servico}`, 20, 118);
            doc.setFont(undefined, 'bold');
            doc.text(`Valor Recebido: R$ ${valorFormatadoPDF}`, 20, 126);
            doc.save(`recibo_${data.nome.replace(/\s+/g, '_')}_${data.data}.pdf`);
        };
    });

    // --- 5. MODAL DE CONFIGURAÇÕES (LocalStorage) ---
    const settingsModal = document.getElementById('settings-modal');
    const settingsIcon = document.getElementById('settings-icon');
    const closeButton = document.querySelector('.close-button');
    const btnSalvarConfig = document.getElementById('btnSalvarConfig');

    const modalFields = {
        nome: document.getElementById('pousadaNome'),
        cpf: document.getElementById('pousadaCpf'),
        responsavel: document.getElementById('pousadaResponsavel'),
        whatsapp: document.getElementById('pousadaWhatsapp'),
        endereco: document.getElementById('pousadaEndereco')
    };

    function openModal() {
        // Preenche o modal com os dados atuais
        modalFields.nome.value = pousadaInfo.nome;
        modalFields.cpf.value = pousadaInfo.cpf;
        modalFields.responsavel.value = pousadaInfo.responsavel;
        modalFields.whatsapp.value = pousadaInfo.whatsapp;
        modalFields.endereco.value = pousadaInfo.endereco;
        settingsModal.style.display = 'flex';
    }

    function closeModal() {
        settingsModal.style.display = 'none';
    }

    settingsIcon.addEventListener('click', openModal);
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == settingsModal) {
            closeModal();
        }
    });

    btnSalvarConfig.addEventListener('click', () => {
        // Atualiza o objeto de informações
        pousadaInfo.nome = modalFields.nome.value;
        pousadaInfo.cpf = modalFields.cpf.value;
        pousadaInfo.responsavel = modalFields.responsavel.value;
        pousadaInfo.whatsapp = modalFields.whatsapp.value;
        pousadaInfo.endereco = modalFields.endereco.value;

        // Salva no localStorage
        localStorage.setItem('pousadaInfo', JSON.stringify(pousadaInfo));
        
        showNotification('Configurações salvas com sucesso!', 'success');
        closeModal();
    });
});