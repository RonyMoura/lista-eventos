// VALORES QUE CONSTAM DO BANCO DE DADOS DO FIREBASE:
    const firebaseConfig = {
    apiKey: "AIzaSyBGtX39eiMXhMIeUqYc4u8q1wLqhhLCAAw",
        authDomain: "listaoeventos.firebaseapp.com",
        projectId: "listaoeventos",
        storageBucket: "listaoeventos.firebasestorage.app",
        messagingSenderId: "604942189028",
        appId: "1:604942189028:web:a882f7c0ea7009146507f1",
        measurementId: "G-YZ6FT6PJH5", 
    
        databaseURL: "https://listaoeventos-default-rtdb.firebaseio.com/" // OBRIGATÓRIO para Realtime Database
        // ... outras chaves, se quiser
    };

    // Inicializa o Firebase
    const app = firebase.initializeApp(firebaseConfig);
    // Obtém a referência para o banco de dados
    const database = firebase.database();
    // Cria uma referência para o nó onde os dados salvos serão armazenados
    const dbRef = database.ref('autoridades_presentes');    
    //Tratamento em caso de perda de conexão com o banco de dados:
    // NOVO BLOCO: Monitoramento do Estado da Conexão
    // Variável de controle para ignorar o primeiro disparo do listener.
    // O listener é sempre disparado no carregamento, mesmo que a conexão seja True.
    let firstLoad = true;//Descarta o primeiro disparo
    let isConnected = true; // Estado inicial

    const conexaoRef = database.ref('.info/connected');

    conexaoRef.on('value', (snapshot) => {
        const novaConexao = snapshot.val();
        
        // 1. IGNORAR O PRIMEIRO DISPARO
        if (firstLoad) {
            isConnected = novaConexao; // Define o estado inicial corretamente
            firstLoad = false;         // Desativa o controle
            
            // Se a conexão estiver perdida NA CARGA, exibe o aviso.
            // (Isso lida com a situação em que o usuário carrega a página já offline, o que é raro, mas possível).
            if (!novaConexao) {
                //console.warn("Conexão com Firebase perdida no carregamento. As operações de gravação serão adiadas.");
            }
            return; // Sai da função, ignorando o restante da lógica de mudança de estado.
        }

        // 2. LÓGICA DE MUDANÇA DE ESTADO (Executada somente após o primeiro disparo)
        
        if (novaConexao && !isConnected) {
            // Conexão reestabelecida
            isConnected = true;                
            // Remove o alerta de desconexão                
            //console.log("Conexão com Firebase reestabelecida.");
        } else if (!novaConexao && isConnected) {
            // Conexão perdida
            isConnected = false;                
            // Exibe o alerta para o usuário:
            alert("ALERTA: Conexão com o servidor perdida! Os dados serão salvos localmente e enviados assim que a conexão retornar.");                
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

    // DECLARAÇÃO DE VARIÁVEIS:
    const campoFiltroNomeCargo = document.getElementById('filtroNomeCargo');
    const campoFiltroIndice = document.getElementById('filtroIndice');
    let tabela = document.getElementById('tbDados');
    const opcao = document.querySelectorAll('input[name="opcaoNomeCargo"]');
    const refTabelas = document.getElementById('tabelas');//as tabelas foram envolvidas nessa div para, a partir do elemento pai, com a delegação de eventos capturar os cliques nas duas tabelas
    let numCaract; //é para puxar a tabela principal sempre que um caracter for apagado
    let coluna = 2; //inicia com a referência para a coluna nome, e muda ao mudar a opção via radio
    let controlLabel;//variável para iniciar a contagem do label, que será inserido na função inserirLabel        
    const containerIndices = document.getElementById('botoesIndices');//obter os elementos que compõem os índices
    

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
        // 3. Verifica se o clique veio de um botão 'Salvar'
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

    /*Desta forma, a função vai percorrer as tabelas por completo, mesmo usando o método has, que tora isso mais eficiente:
    function aplicarEstiloBotoesFirebase() {
        const linhas = tabela.querySelectorAll('tbody tr');//pega os elementos linhas da tabela tbDados
        const linhas2 = document.querySelectorAll('#tbDados2 tbody tr');//pega os elementos linhas da tabela tbDados2
        linhas.forEach(linha => {
            const idLinha = `${linha.rowIndex}${'tbDados'}`;
            vericaIdCorresp(idLinha, linha);
        });
        linhas2.forEach(linha => {
            const idLinha = `${linha.rowIndex}${'tbDados2'}`;
            vericaIdCorresp(idLinha, linha);
        });            
        function vericaIdCorresp(idLinha, elementoLinha) {                                
            
            if (listaIDsSalvos.has(idLinha)) {
                const botao = elementoLinha.querySelector('.btn-slr');
                if (botao) {
                    botao.classList.add('botao-salvo');
                    botao.textContent = 'Salvo';
                }
            }
        }

    }*/

    /*Desta forma, vamos buscar dentro da tabela a linha exata que deve ser alterada, não percorrendo tudo pelo for:*/
    // Adicionamos o parâmetro idNovo que agora pode ser opcional (padrão null)
    function aplicarEstiloBotoesFirebase(idNovo = null) {
    
        // 1. Declaramos a sub-função no topo para ela estar disponível para todos
        function executarPintura(elementoLinha) {
            if (!elementoLinha) return;
            const botao = elementoLinha.querySelector('.btn-slr');
            if (botao) {
                botao.classList.add('botao-salvo');
                botao.textContent = 'Salvo';
            }
        }

        // 2. Lógica para atualização em tempo real (Atalho)
        if (idNovo) {
            const indice = parseInt(idNovo); 
            
            // CORREÇÃO DA LÓGICA: Verificamos o '2' primeiro por ser mais específico
            const seletorTabela = idNovo.includes('tbDados2') ? '#tbDados2' : '#tbDados';
            const tabelaAlvo = document.querySelector(seletorTabela);

            if (tabelaAlvo) {
                const linhaEspecifica = tabelaAlvo.rows[indice];
                if (linhaEspecifica) {
                    executarPintura(linhaEspecifica);
                    }
            }
            return; 
        }

        // 3. Lógica para o carregamento inicial (Loop)
        const linhas = document.querySelectorAll('#tbDados tbody tr');
        const linhas2 = document.querySelectorAll('#tbDados2 tbody tr');

        linhas.forEach(linha => {
            const idLinha = `${linha.rowIndex}${'tbDados'}`;
            if (listaIDsSalvos.has(idLinha)) executarPintura(linha);
        });

        linhas2.forEach(linha => {
            const idLinha = `${linha.rowIndex}${'tbDados2'}`;
            if (listaIDsSalvos.has(idLinha)) executarPintura(linha);
        });
    }        
    
    //VAMOS ADICIONAR DADOS À TABELA-RELATÓRIO:
    function povoarTbRelatorios() {
        const divTabelaRelatorio = document.getElementById('tabelaRelatorio');
        const tabelaRelatorio = document.createElement('table');
        tabelaRelatorio.id = "tabelaRelatorio";
        const estrutura = document.createElement('thead');
        const estrutura2 = document.createElement('tr');
        const cabecalho = document.createElement('th');
        cabecalho.textContent = 'NOME/CARGO';
        estrutura2.appendChild(cabecalho);
        estrutura.appendChild(estrutura2);           
        tabelaRelatorio.appendChild(estrutura);
        divTabelaRelatorio.appendChild(tabelaRelatorio);            
        const tabelaSalvos = document.getElementById('tabela-salvos');
        const linhasSalvos = tabelaSalvos.querySelectorAll('tr');
        linhasSalvos.forEach(linha => {
            if (linha.cells[0].tagName === 'TH') return;

            const tdLinha = document.createElement('tr');
            const tdNomeCargo = document.createElement('td');
            tdNomeCargo.style.textAlign = 'center';
            for (let i = 0; i < linha.cells.length - 1; i++) {
                const texto = linha.cells[i].textContent;

                if (i === 0) {
                    //O innerHTML é melhor que o textContent, pois vais adicionar elementos html ao texto
                    tdNomeCargo.innerHTML += `<strong>${texto}</strong><br>`;
                } else {
                    //neste caso também, pois vamos adicionar uma quebra de linha ao texto
                    tdNomeCargo.innerHTML += `${texto}<br>`;
                }
            }
            tdLinha.appendChild(tdNomeCargo);
            tabelaRelatorio.appendChild(tdLinha);
        });
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
            const tabelaRelatorio = document.getElementById('tabelaRelatorio').replaceChildren();//mesmo que innerHTML = "" (para zerar as informações de toda a tabela)
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

    //A tecnica do Set deixa mais performático, pois altera a forma como o navegdor buscará os dados
    let listaIDsSalvos = new Set();//Criamos uma variável global para guardar os IDs que já estão no banco
            
    function carregarIdsFirebase(){//Função para buscar esses IDs no carregamento
        
        //Desta forma, ele vai carregar repetidas vezes o set do firebase, todos os dados que estão lá:
        /*
        dbRef.once('value', (snapshot) => {
            // Limpamos o Set para evitar duplicatas se a função rodar de novo
            listaIDsSalvos.clear();

            snapshot.forEach((filho) => {
                const dado = filho.val();
                if (dado.idBotao) {
                    // Adicionamos o ID recuperado na nossa lista de consulta rápida
                    listaIDsSalvos.add(dado.idBotao);
                }
            });*/            

        //Desta forma, vai apenas adicionar as atualizações, evitando consumo excessivo de dados:
        dbRef.on('child_added',(snapshot) => {
            const dado = snapshot.val();
            const idNovo = dado.idBotao;
            //Se o id não estiver, adiciona e pinta:
            if (idNovo && !listaIDsSalvos.has(idNovo)) {
                listaIDsSalvos.add(idNovo);
                aplicarEstiloBotoesFirebase(idNovo);
                }
        })   
        
    }        
    //Ouvinte de sincronização em tempo real da tabela-salvos
    dbRef.on('child_added', (snapshot) => {
        // A função 'on' é chamada uma vez para cada item existente 
        // e depois sempre que um novo item é adicionado por qualquer usuário.
        adicionarLinhaSalva(snapshot);
    });
    //Disparado assim que a página é reiniciada
    document.addEventListener('DOMContentLoaded', () => {
        // A página terminou de carregar o HTML
        carregarIdsFirebase();
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
                
                // Define ou atualiza o texto (vinda do servidor)
                label.textContent = dados.etiqueta;
            }
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
    //Assim que o firebase recebe um valor do checkbox, ele dispara o evento para atualizar para os demais usuários:
    dbRef.on('child_changed', (snapshot) => { 
        const dados = snapshot.val();
        const key = snapshot.key; //pega o valor key contido no firebase
        if (dados.estadoCheck !== undefined) { //verifica se a mudança ocorreu exatamente no estadoCheck
            const linha = document.querySelector(`tr[data-key="${key}"]`); //percorre as linhas da tabela
            let caixa = linha.querySelector('.check-custom');//ca´tura do elemento checkbox
            caixa.checked = dados.estadoCheck;  //muda o estado do elemento
        }
    })

