let database;
let dbRef;
let firstLoad = true;
let isConnected = true;
let tabela;
const campoFiltroNomeCargo = document.getElementById('filtroNomeCargo');
const campoFiltroIndice = document.getElementById('filtroIndice');
const opcao = document.querySelectorAll('input[name="opcaoNomeCargo"]');
const refTabelas = document.getElementById('tabelas');//as tabelas foram envolvidas nessa div para, a partir do elemento pai, com a delegação de eventos capturar os cliques nas duas tabelas
let numCaract; //é para puxar a tabela principal sempre que um caracter for apagado
let coluna = 2; //inicia com a referência para a coluna nome, e muda ao mudar a opção via radio
let controlLabel;//variável para iniciar a contagem do label, que será inserido na função inserirLabel        
const containerIndices = document.getElementById('botoesIndices');//obter os elementos que compõem os índices 
const mapaBotoes = new Map();//armezanar os botões que foram salvos. O Set foi substituído, por armazenas apenas listas o que obriga o script percorrer a tabela em busca de um texto específico
const linhasSalvos = new Map();// armezenar as linhas da tabela-salvos

//Inicialização da configuração do rirebase:
const firebaseConfig = {
    apiKey: "AIzaSyBGtX39eiMXhMIeUqYc4u8q1wLqhhLCAAw",
    authDomain: "listaoeventos.firebaseapp.com",
    projectId: "listaoeventos",
    storageBucket: "listaoeventos.firebasestorage.app",
    messagingSenderId: "604942189028",
    appId: "1:604942189028:web:a882f7c0ea7009146507f1",
    measurementId: "G-YZ6FT6PJH5", 
    databaseURL: "https://listaoeventos-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);

// 1. O OBSERVADOR DE LOGIN ENCAPSULA A INICIALIZAÇÃO
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Agora o login foi feito, podemos definir o banco com segurança
        database = firebase.database();
        dbRef = database.ref('autoridades_presentes');
        
        //console.log("Acesso autorizado para:", user.uid);

        //MOVA A LÓGICA DE CONEXÃO PARA DENTRO DO IF (USER)
        const conexaoRef = database.ref('.info/connected');
        
        //LÓGICA PARA VERIFICAR OS STATUS DA CONEXÃO COM O BANCO DE DADOS
        conexaoRef.on('value', (snapshot) => {
            const novaConexao = snapshot.val();
            
            if (firstLoad) {
                isConnected = novaConexao;
                firstLoad = false;
                return;
            }

            if (novaConexao && !isConnected) {
                isConnected = true;
            } else if (!novaConexao && isConnected) {
                isConnected = false;
                alert("ALERTA: Conexão perdida! Os dados serão enviados assim que a conexão retornar.");
            }
        });

    //Ouvinte de sincronização em tempo real da tabela-salvos
    dbRef.on('child_added', (snapshot) => {
        // A função 'on' é chamada uma vez para cada item existente 
        // e depois sempre que um novo item é adicionado por qualquer usuário.
        adicionarLinhaSalva(snapshot);
    });

    
    //Desta forma, vai apenas adicionar as atualizações, evitando consumo excessivo de dados:
    dbRef.on('child_added',(snapshot) => {
        const dado = snapshot.val();
        const idNovo = dado.idBotao;//é justamente a juntação do índice da linha da tabela com o id da tabela
        
        if (!mapaBotoes.has(idNovo)) {
            const tabelas = {
            'tbDados': document.querySelector('#tbDados'),
            'tbDados2': document.querySelector('#tbDados2')
            };
            
            if (idNovo) {
                const nomeTabela = idNovo.includes('tbDados2') ? 'tbDados2' : 'tbDados';
                const tabelaAlvo = tabelas[nomeTabela]; // Acesso direto ao objeto da tabela
                const linha = tabelaAlvo.rows[parseInt(idNovo)];
                const idLinha = `${linha.rowIndex}${'tbDados'}`;
                mapaBotoes.set(idLinha, linha);
                const botao = linha.querySelector('.btn-slr');
                botao.classList.add('botao-salvo');
                botao.textContent = 'Salvo';
            };                
        };    
    });        

    /*Ouvinta para capturar a inserção de etiquetas:*/
    dbRef.on('child_changed', (snapshot) => { //(dbRef.on(''))
        const dados = snapshot.val();
        const key = snapshot.key;

        // Verificamos se a mudança foi especificamente no campo 'etiqueta'
        if (dados.etiqueta !== undefined) {
            // Procura a linha correta na tabela de QUALQUER usuário
            const linha = document.querySelector(`tr[data-key="${key}"]`);
            
            if (linha) {
                const celula = linha.cells[2];
                const divContainer = celula.querySelector('div');
                let label = divContainer.querySelector('label');

                // Se o label ainda não existe no HTML deste usuário, criamos agora
                if (!label) {
                    label = document.createElement("label");
                    label.className = "LabelRepres";
                    divContainer.appendChild(label);
                }
                
                // Define ou atualiza o texto (vindo do servidor)
                label.textContent = dados.etiqueta;
            }
        }
    });

    //Assim que o firebase recebe um valor do checkbox, ele dispara o evento para atualizar para os demais usuários:
    dbRef.on('child_changed', (snapshot) => { 
        const dados = snapshot.val();
        const key = snapshot.key; //pega o valor key contido no firebase
        
        if (dados.estadoCheck !== undefined) {//verifica se a alteração foi realizada no checkbox
            const linha = linhasSalvos.get(key);
            let check = linha.querySelector('.check-custom');
            check.checked = dados.estadoCheck;
        }
    })    

    } else {
        firebase.auth().signInAnonymously().catch(error => {
            console.error("Erro no login:", error.message);
        });
    }
});

    // Função auxiliar de Debounce, para aplicar um delay ao chamar a função aplicarFiltro
    function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId); // Limpa o timer anterior (cancela a execução pendente)
        timeoutId = setTimeout(() => {
        func.apply(this, args); // Executa a função após o tempo de espera (delay)
        }, delay);
    };
    }
    const filtroDebounced = debounce(aplicarFiltros, 700);//atrasa o filtro em 600ms, para a função não ser chamada assim que uma nova tecla é digitada

    // Função para aplicar os filtros
    function aplicarFiltros() {
        //Se ambos os campos (inputs) estiverem vazios, retornar para a tabela principal:
        const inputsVazios = (campoFiltroIndice.value === "" &&
        campoFiltroNomeCargo.value === "" && tabela.id == 'tbDados2');
        if(inputsVazios){
            voltarTabelaPrincipal();
        }           
        // Valor do filtro geral (convertido para minúsculas)
        const textoNomeCargo = campoFiltroNomeCargo.value.toLowerCase();
        // Valor do filtro da primeira coluna (convertido para minúsculas)
        const textoIndice = campoFiltroIndice.value.toLowerCase();

        let linhasVisiveis = 0;

        // Percorre todas as linhas da tabela (exceto o cabeçalho, por isso i começa em 1)
        for (let i = 1; i < tabela.rows.length; i++) {
            const linha = tabela.rows[i];
            
            // LINHA A SER ADICIONADA: Se a linha tiver o ID de feedback, pule para a próxima iteração. (para evitar erro)
            if (linha.id === 'feedback-vazio') {
                continue; 
            }

            // Obtém o texto das células conforme a coluna especificada
            const primeiraCelula = linha.cells[0].textContent.toLowerCase();
            const terceiraCelula = linha.cells[coluna].textContent.toLowerCase();

            //Verificar se o texto digitado foi encontrado na célula e retorna verdadeiro ou falso:
            const correspondeprimeiraCelula = primeiraCelula.includes(textoIndice);
            const correspondeterceiraCelula = terceiraCelula.includes(textoNomeCargo);

            //Se ambas retornarem verdadeiro
            if(correspondeprimeiraCelula && correspondeterceiraCelula){
                //mostra a linha sem estilização
                linha.style.display = '';
                linhasVisiveis ++;// caso retorne zero, a filtragem deve ser feita na tabela adicional                    
            }else{
                //oculte a linha da tabela
                linha.style.display = 'none';                    
            }                                
        }
        
        if(linhasVisiveis == 0 && tabela.id === 'tbDados'){
            tabela.style.display = 'none'// deixar a tabela principal invisível
            tabela = document.getElementById('tbDados2');// mudar a referência da tabela
            tabela.style.display = ''// deixar a tabela secundárioa visível
            ocultarColuna(tabela.id,0);//ocultar a primeira coluna da tabela
            aplicarFiltros()//chamar a função novamente                
        }else if(tabela.id === 'tbDados2' && linhasVisiveis == 0){//nesse bloco de comando, o texto não foi encontrado em nenhuma das tabelas...
            return;
        }
        
        //sempre que um caractere for apagado do input, a busca deve ser realizada novamente na tabela principal
        if(textoNomeCargo.length < numCaract){
            voltarTabelaPrincipal();                
            numCaract = textoNomeCargo.length;//deve ser igualado para não entrar em loop
            aplicarFiltros();                
        }else{
        numCaract = textoNomeCargo.length;//deve ser igualado para novamente, para forçar entrar neste if
        }
    }                           
    
    //FUNÇÃO A SER CHAMADA QUANDO OS RADIOS FOREM MODIFICADOS:
    function opcaoRadios(e){            
        if(document.getElementById('radioA').checked){
            coluna = 2;               
        }else{
            coluna = 3;
        }           
        campoFiltroNomeCargo.focus();
        voltarTabelaPrincipal();
        aplicarFiltros();
    }

    // DETECTA O EVENTO POR DELEGAÇÃO DE EVENTOS (ELEMENTO FILHO ATÉ O ELEMENTO PAI)
    //Deteca os cliques dos botões salvar, dentro das tabelas 
    refTabelas.addEventListener('click', function(event) {            
        // Verifica se o clique veio de um botão 'Salvar'
        if (event.target.classList.contains('btn-slr')) {
            const botaoClicado = event.target;                
            const corBotao = window.getComputedStyle(botaoClicado).backgroundColor;
            const tabela = botaoClicado.closest('table');//captura a tabela clicada, para auxiliar na definicação do texto (cor/estilo)
            // Verifica se o botão teve a cor modificada
            if(corBotao == 'rgb(0, 120, 0)'){
                return;
            }else{                
                const linha = botaoClicado.closest('tr');//captura o elemento pai mais próximo do botão, no caso a linha, depois da célula
                const celulas = linha.querySelectorAll("td");
                const indexLinha = linha.rowIndex;// captura o índice da linha em questão
                const idBotao = `${indexLinha}${tabela.id}`;
                botaoClicado.setAttribute('data-id', idBotao);
                mapaBotoes.set(idBotao, botaoClicado);//mapeando o elemento html             
            
                // Extrair Nome e Cargo
                const nome = celulas[2].textContent;
                const cargo = celulas[3].textContent;
                let corTexto = (tabela.id === 'tbDados');//passar true/false a depender da tabela, para definir a cor do texto
                if (corTexto) {corTexto = 1 }else{(corTexto = 0)};
                    
                // --- NOVA LÓGICA: ADICIONAR AO FIREBASE ---
                const novoDado = {
                    nome: nome.trim(),
                    cargo: cargo.trim(),
                    corTexto: corTexto,// se for true, quer dizer que se trata da tabela principal
                    etiqueta: null, // Inicialmente sem etiqueta (informação de representação)
                    idBotao: idBotao,//id gerado para identificação da linha salva
                    timestamp: Date.now() // Ajuda na ordenação e unicidade                        
                };

                //LINHA ACRESCENTADA PARA CORRIGIR O FUNCIONAMENTO DA COR DO BOTÃO SALVAR:
                //MESMO SE NÃO HOUVER CONEXÃO, O BOTÃO DEVE TER A COR ALTERADA PARA O USUÁRIO EM QUESTÃO:
                botaoClicado.classList.add('botao-salvo');//adiciona a cor assim que a classe é adicionada, pois a cor foi definida na classe 'botao-salvo'
                botaoClicado.textContent = 'Salvo';
                
                
                // Envia o novoDado para o Firebase. O 'push()' gera uma chave única (ID).
                dbRef.push(novoDado)                    
                
                    .catch((error) => {
                        console.error("Erro ao salvar no Firebase:", error);
                        alert("Erro ao salvar o dado. Verifique o console.");
                    });
            }                  
        }          

    });

        //Função para limpar o inputs:
    function limparInput() {
        document.getElementById("filtroIndice").value = "";
        document.getElementById("filtroNomeCargo").value = "";
        document.getElementById("filtroNomeCargo").focus(); //volta o cursor do mouse para o campo
        document.getElementById("radioA").checked = true;//voltar a seleção para o radio A

        voltarTabelaPrincipal();
        opcaoRadios(); //necessário para atualizar o valor da coluna            
        aplicarFiltros();
        filtrarIndice();
        
        if (containerIndices.style.display === '') {//se o container estiver invisível, deixá-lo visível
            containerIndices.style.display = 'none';                
        }
        campoFiltroIndice.style.marginBottom = '10px'//volta o valor para o padrão definido inicialmente
    }      
    //Modificada função inserirLabel
    function inserirLabel(e){

        const linhaClicada = e.target.closest('tr');
        const linhaCabecalho = (e.target.tagName === 'TH' || e.target.tagName === 'THEAD');
        if (linhaCabecalho || !linhaClicada) return;            
        const key = linhaClicada.getAttribute('data-key'); // Pega a chave do Firebase

        if (!key) return; // Se não tiver chave, algo deu errado, aborta.

        // Verificamos se já existe um label na tela para evitar envios duplicados ao Firebase
        const celula = linhaClicada.cells[2];
        const contemLabel = celula.querySelector('label');
        
        if (!contemLabel) {
            // Lógica de contagem
            const labels = document.querySelectorAll('#tabela-salvos .LabelRepres');
            const controlLabel = labels.length + 1;

            // Única ação: Atualizar o Firebase
            // O Firebase vai disparar o 'child_changed' para TODO MUNDO (incluindo você)
            dbRef.child(key).update({ etiqueta: controlLabel });
        }
    }      
    
    //FUNÇÃO PARA OCULTAR A COLUNA DA TABELA
    /**
     * Oculta uma coluna específica de uma tabela HTML.
     * @param {string} tableId - O ID do elemento da tabela.
     * @param {number} columnIndex - O índice (base 0) da coluna a ser ocultada.
     */
    function ocultarColuna(tableId, columnIndex) {
        // 1. Obtém o elemento da tabela pelo ID
        const table = document.getElementById(tableId);

        // Verifica se a tabela existe
        if (!table) {
            console.error("Tabela com ID '" + tableId + "' não encontrada.");
            return;
        }

        // 2. Itera sobre todas as linhas da tabela (incluindo <thead> e <tbody>)
        // O 'rows' é uma coleção de todas as linhas <tr>
        for (let i = 0; i < table.rows.length; i++) {
            const row = table.rows[i];
            
            // 3. Verifica se a linha tem a célula no índice especificado
            // row.cells contém tanto <td> quanto <th>
            if (columnIndex < row.cells.length) {
                // 4. Seleciona a célula (<td> ou <th>) e define o estilo para 'none'
                row.cells[columnIndex].style.display = 'none';
            }
        }
    }
    
    //FUNÇÃO PARA RETORNAR PARA TABELA PRINCIPAL
    function voltarTabelaPrincipal(){
        if(tabela.id === 'tbDados2'){
            tabela.style.display = 'none';
            tabela = document.getElementById('tbDados');// mudar a referência da tabela
            tabela.style.display = ''// deixar a tabela secundárioa visível
        }
    }

    // Função para desenhar uma nova linha na tabela de salvos
    function adicionarLinhaSalva(snapshot) {
        const data = snapshot.val(); // Os dados do Firebase (nome, cargo, etiqueta)
        const key = snapshot.key;   // O ID único gerado pelo Firebase
        //const tabelaBody = document.getElementById("tabela-salvos").querySelector("tbody");
        const tabelaBody = document.querySelector ('#tabela-salvos tbody');

        //Criar a nova linha e setar o ID do Firebase como data-attribute
        const novaLinha = document.createElement("tr");
        
        novaLinha.setAttribute('data-key', key); // Armazena a chave para futuras atualizações/exclusões
        linhasSalvos.set(key, novaLinha);

        //Criar células
        const tdNome = document.createElement("td");
        tdNome.textContent = data.nome;
        //Alterar a cor apenas se a linha salva foi da tabela principal (evneto em questão)
        if (data.corTexto == 1) {
            tdNome.style.color = 'blue';
            tdNome.style.fontWeight = 'bold';    
        }
        const tdCargo = document.createElement("td");
        tdCargo.textContent = data.cargo;

        const tdEtiquetas = document.createElement("td");
        const flexContainer = document.createElement("div");
        flexContainer.classList.add("flex-alinhamento");
        tdEtiquetas.appendChild(flexContainer);

        // Adiciona o checkbox
        const checkEtiquetas = document.createElement("input");
        checkEtiquetas.type = "checkbox";
        checkEtiquetas.classList.add("check-custom");
        checkEtiquetas.checked = data.estadoCheck;
        flexContainer.appendChild(checkEtiquetas);

        // Se o dado tiver uma etiqueta salva, exiba-a
        if (data.etiqueta) {
            const label = document.createElement("label");
            label.className = "LabelRepres";
            label.textContent = data.etiqueta;
            flexContainer.appendChild(label);                                 
        }
        
        //Adicionar as células à linha
        novaLinha.appendChild(tdNome);
        novaLinha.appendChild(tdCargo);
        novaLinha.appendChild(tdEtiquetas);
        
        //Inserir a nova linha na tabela
        tabelaBody.appendChild(novaLinha);
        
        }        
                
    const alertaIndice = document.getElementById('opcaoIndice');
    function filtrarIndice() {
            
        if (containerIndices.style.display === 'none') {//se o container estiver invisível, deixá-lo visível
            containerIndices.style.display = '';
        }else if (campoFiltroIndice.value === "") {//se o input estiver vazio, deixar i container de índices e o alerta invisíveis
            containerIndices.style.display = 'none'
            alertaIndice.style.display = 'none';
    
        }
        const indices = containerIndices.querySelectorAll('.indices');//Como se trata de uma classe, o ponto antes do nome é fundamental
        const textoIndice = campoFiltroIndice.value.toLowerCase();
        let nIndices = 0;

        indices.forEach(indice => {
            const textoDiv = indice.textContent.toLocaleLowerCase();
            const correspondencia = textoDiv.includes(textoIndice);
            if (!correspondencia) {
                indice.style.display = 'none';
            }else{
                indice.style.display = 'flex';
                nIndices ++;//conta o número de índices visíveis
            }
        });
        
        if (nIndices === 1 ) {                
            alertaIndice.style.display = 'none'//esconder o alerta, pois não é necessário
            campoFiltroIndice.style.marginBottom = '10px'
        }else if (nIndices > 1 && nIndices !== indices.length) {
            alertaIndice.style.display = '';
            campoFiltroIndice.style.marginBottom = '1px'//aqui o input deve permitir a aproximação do alerta
            alertaIndice.style.marginTop = '3px';
        }

        aplicarFiltros();            
    }
        
    //VAMOS ADICIONAR DADOS À TABELA-RELATÓRIO:
    function povoarTbRelatorios() {
        const divTabelaRelatorio = document.getElementById('div-tabelaRelatorio');
        // Limpa a div antes de criar uma nova para evitar tabelas duplicadas
        divTabelaRelatorio.innerHTML = ''; 

        const tabelaRelatorio = document.createElement('table');
        tabelaRelatorio.id = "tabelaRelatorio";

        // --- ESTRUTURA DO CABEÇALHO (THEAD) ---
        const estruturaHead = document.createElement('thead');
        const linhaHead = document.createElement('tr');
        const cabecalho = document.createElement('th');
        cabecalho.textContent = 'NOME/CARGO';
        cabecalho.style.cursor = 'pointer'; // Indica que é clicável

        linhaHead.appendChild(cabecalho);
        estruturaHead.appendChild(linhaHead);
        
        // IMPORTANTE: Adiciona o THEAD direto na TABELA
        tabelaRelatorio.appendChild(estruturaHead);

        // --- ESTRUTURA DO CORPO (TBODY) ---
        const corpoTabela = document.createElement('tbody');
        tabelaRelatorio.appendChild(corpoTabela);

        // Adiciona a tabela na DIV agora para ela já existir no DOM
        divTabelaRelatorio.appendChild(tabelaRelatorio);

        const tabelaSalvos = document.getElementById('tabela-salvos');
        const linhasSalvos = tabelaSalvos.querySelectorAll('tr');

        linhasSalvos.forEach(linha => {
            if (linha.cells.length === 0 || linha.cells[0].tagName === 'TH') return;

            const tdLinha = document.createElement('tr');
            const tdNomeCargo = document.createElement('td');
            tdNomeCargo.style.textAlign = 'center';

            for (let i = 0; i < linha.cells.length - 1; i++) {
                const texto = linha.cells[i].textContent;
                if (i === 0) {
                    tdNomeCargo.innerHTML += `<strong>${texto}</strong><br>`;
                } else {
                    tdNomeCargo.innerHTML += `${texto}<br>`;
                }
            }
            tdLinha.appendChild(tdNomeCargo);
            corpoTabela.appendChild(tdLinha); // Adiciona a linha ao TBODY
        });

        // Inicializa o Tablesort após a estrutura estar correta e no DOM
        try {
            new Tablesort(tabelaRelatorio);
        } catch (e) {
            console.error("Erro ao carregar Tablesort:", e);
        }
    }        
    function ImprimirRelatorio() {
        window.print();
    }
    //Funcação para tornar o container da tabela de dados salvos visível:    
    function toggleModal() {
        const modal = document.getElementById('meuModal');
        
        // Verifica se está visível ou não
        if (modal.style.display === 'flex') {                
            modal.style.display = 'none';
            } else {
            const DivtabelaRelatorio = document.getElementById('div-tabelaRelatorio').replaceChildren();//mesmo que innerHTML = "" (para zerar as informações de toda a tabela)
            modal.style.display = 'flex';
            povoarTbRelatorios();                        
        }
    }

    //AS LINHAS ABAIXO CAPTURAM OS EVENTOS:
    // Adiciona eventos de escuta para os campos de filtro
    campoFiltroNomeCargo.addEventListener('keyup', filtroDebounced);
    campoFiltroIndice.addEventListener('keyup', filtrarIndice);
    
    //Eventos dos botões de opções
    opcao.forEach((radio) => {
    radio.addEventListener('change', opcaoRadios);
    });

    //Evento de duplo clique: adiciona um elemento à tabela para acrescentar opção de representação:
    const meuElemento = document.getElementById('tabela-salvos');
    meuElemento.addEventListener('dblclick', inserirLabel); 

    //DELEGAÇÃO DE EVENTO, CLIQUE DENTRO DA DIV ONDE ESTÃO OS ÍNDICES:
    containerIndices.addEventListener('click', function(e) {
    // 1. VERIFICAÇÃO CRÍTICA: Executa a lógica SOMENTE se o alvo do clique 
    //    tiver a classe específica 'indices'.
        if (e.target.classList.contains('indices')) {                
                            
            // 2. O 'e.target' agora é garantidamente a div de índice clicada
            const textoIndice = e.target.textContent; 
            
            campoFiltroIndice.value = textoIndice;
            filtrarIndice();                
            // Lógica de Ocultação/Estilo
            const elementos = document.getElementById('botoesIndices');
            elementos.style.display = 'none';
            alertaIndice.style.display = 'none';
            campoFiltroIndice.style.marginBottom = '10px';               
        }            
    });  

    
    //Captuar o evento de click no checkbox para a sincronização dos usuários:
    const tabelaclicada = document.querySelector('#tabela-salvos');//define o lugar do click
    tabelaclicada.addEventListener('click', function (e) {
        cliquecheck = (e.target.classList.contains('check-custom'));//verifica se o click foi no elemento específico
        if (cliquecheck) {
            let valorCaixa = e.target.checked;
            const linhaClicada = e.target.closest('tr');//vai subir até encontrar o elemento indicado (no caso a linha)
            const key = linhaClicada.getAttribute('data-key');// pega o valor da linha em clicada
            dbRef.child(key).update({estadoCheck: valorCaixa});//passar o valor da caixa para o firebase
        }
    })

    //Disparado assim que a página é iniciada/reiniciada
    document.addEventListener('DOMContentLoaded', async() => {
        // A página terminou de carregar o HTML        
        await carregarTabelasHTML(); //A função deve denecessáriamente ser carrega 'sincronamente', pois temos valores que devem ser completamente carregados
        tabela = document.getElementById('tbDados');          
    });


    
    /*
    Verificar os arquivos das versões anteriores
    */
    async function carregarTabelasHTML() {
    try {
        // Dispara os dois pedidos ao mesmo tempo
        const [resp1, resp2] = await Promise.all([
            fetch('tbDados.html'),
            fetch('tbDados2.html')
        ]);

        // Converte ambos para texto
        const html1 = await resp1.text();
        const html2 = await resp2.text();

        // Injeta nos respectivos lugares
        document.getElementById('tabelas').innerHTML = html1; 
        // Se for na mesma div, use += para não apagar a primeira
        document.getElementById('tabelas').innerHTML += html2; 

    } catch (erro) {
        alert("Erro ao carregar uma das tabelas:", erro);
    }
}

