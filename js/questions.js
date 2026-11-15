import { gameState } from './gameState.js';

export const DEBUG_QTE = false;
export const ANSWER_LABELS = Object.freeze(['A','B','C','D']);
export const QUESTION_CATEGORIES=Object.freeze([
 'FUNDAMENTOS E TIPOS DE REDES','DISPOSITIVOS DE REDE','MODELO OSI E TCP/IP','ENDEREÇAMENTO IPv4 E IPv6',
 'PROTOCOLOS DE REDE','ETHERNET, MAC E MEIOS','SEGURANÇA BÁSICA','DIAGNÓSTICO E CONECTIVIDADE'
]);
const [FUNDAMENTALS,DEVICES,MODELS,ADDRESSING,PROTOCOLS,MEDIA,SECURITY,DIAGNOSTICS]=QUESTION_CATEGORIES;
const question = (number, category, statement, options, correctIndex, explanation) => Object.freeze({
 id:`net-${String(number).padStart(2,'0')}`, category, statement,
 options:Object.freeze(options), correctIndex, explanation
});
export const QUESTIONS = Object.freeze([
 question(1,MODELS,'QUAL CAMADA DO MODELO OSI É RESPONSÁVEL PELO ROTEAMENTO ENTRE REDES?',
  ['Física','Enlace de Dados','Rede','Aplicação'],2,'A CAMADA DE REDE REALIZA O ENCAMINHAMENTO DE PACOTES ENTRE REDES.'),
 question(2,MODELS,'QUANTAS CAMADAS POSSUI O MODELO OSI?',
  ['4','5','6','7'],3,'O MODELO OSI POSSUI SETE CAMADAS.'),
 question(3,PROTOCOLS,'QUAL PROTOCOLO OFERECE ENTREGA CONFIÁVEL E ORDENADA DE DADOS?',
  ['UDP','TCP','IP','ARP'],1,'O TCP UTILIZA CONFIRMAÇÕES E RETRANSMISSÕES PARA OFERECER ENTREGA CONFIÁVEL.'),
 question(4,ADDRESSING,'QUANTOS BITS POSSUI UM ENDEREÇO IPv4?',
  ['16','32','64','128'],1,'UM ENDEREÇO IPv4 POSSUI 32 BITS.'),
 question(5,ADDRESSING,'QUANTOS BITS POSSUI UM ENDEREÇO IPv6?',
  ['32','48','64','128'],3,'UM ENDEREÇO IPv6 POSSUI 128 BITS.'),
 question(6,ADDRESSING,'QUAL MÁSCARA CORRESPONDE AO PREFIXO IPv4 /24?',
  ['255.0.0.0','255.255.0.0','255.255.255.0','255.255.255.252'],2,'O PREFIXO /24 INDICA 24 BITS DE REDE.'),
 question(7,ADDRESSING,'QUAL DESTES ENDEREÇOS IPv4 É PRIVADO?',
  ['8.8.8.8','192.168.1.10','1.1.1.1','9.9.9.9'],1,'A FAIXA 192.168.0.0/16 É RESERVADA PARA REDES PRIVADAS.'),
 question(8,PROTOCOLS,'QUAL É A PRINCIPAL FUNÇÃO DO DNS?',
  ['DISTRIBUIR ENERGIA','TRADUZIR NOMES DE DOMÍNIO EM ENDEREÇOS IP','CRIPTOGRAFAR DISCOS','CONTROLAR MONITORES'],1,'O DNS PERMITE RESOLVER NOMES DE DOMÍNIO EM ENDEREÇOS IP.'),
 question(9,PROTOCOLS,'QUAL SERVIÇO ATRIBUI CONFIGURAÇÕES IP AUTOMATICAMENTE?',
  ['FTP','DNS','DHCP','SMTP'],2,'O DHCP FORNECE CONFIGURAÇÕES COMO ENDEREÇO IP E GATEWAY.'),
 question(10,PROTOCOLS,'O QUE DIFERENCIA O HTTPS DO HTTP COMUM?',
  ['NÃO UTILIZA REDE','UTILIZA TLS PARA PROTEGER A COMUNICAÇÃO','FUNCIONA APENAS EM IPv6','DISPENSA SERVIDORES'],1,'O HTTPS UTILIZA TLS PARA PROTEGER A COMUNICAÇÃO.'),
 question(11,PROTOCOLS,'QUAL É A PORTA PADRÃO DO HTTP?',
  ['21','22','80','443'],2,'A PORTA PADRÃO DO HTTP É A TCP 80.'),
 question(12,DEVICES,'QUAL DISPOSITIVO ENCAMINHA QUADROS ETHERNET USANDO ENDEREÇOS MAC?',
  ['SWITCH','MONITOR','IMPRESSORA','TECLADO'],0,'SWITCHES ETHERNET UTILIZAM ENDEREÇOS MAC PARA ENCAMINHAR QUADROS.'),
 question(13,DEVICES,'QUAL É A PRINCIPAL FUNÇÃO DE UM ROTEADOR?',
  ['EXIBIR IMAGENS','INTERLIGAR REDES E ENCAMINHAR PACOTES','ARMAZENAR SENHAS','SUBSTITUIR CABOS USB'],1,'ROTEADORES ENCAMINHAM PACOTES ENTRE DIFERENTES REDES.'),
 question(14,MEDIA,'QUAL É O TAMANHO MAIS COMUM DE UM ENDEREÇO MAC ETHERNET?',
  ['16 BITS','32 BITS','48 BITS','128 BITS'],2,'ENDEREÇOS MAC ETHERNET TRADICIONAIS POSSUEM 48 BITS.'),
 question(15,MEDIA,'PARA QUE SERVE O ARP EM UMA REDE IPv4 LOCAL?',
  ['RESOLVER IPv4 EM ENDEREÇO MAC','CRIAR SENHAS','COMPACTAR ARQUIVOS','ENVIAR E-MAILS'],0,'O ARP DESCOBRE O ENDEREÇO MAC ASSOCIADO A UM IPv4 NA REDE LOCAL.'),
 question(16,ADDRESSING,'QUAL É UMA FUNÇÃO COMUM DO NAT?',
  ['AUMENTAR A MEMÓRIA RAM','TRADUZIR ENDEREÇOS IP','CRIAR CABOS DE REDE','SUBSTITUIR O DNS'],1,'O NAT TRADUZ ENDEREÇOS IP ENTRE CONTEXTOS DE REDE.'),
 question(17,MEDIA,'QUAL PADRÃO É ASSOCIADO ÀS REDES WI-FI?',
  ['IEEE 802.11','HDMI','SATA','USB'],0,'A FAMÍLIA IEEE 802.11 DEFINE TECNOLOGIAS DE REDES WI-FI.'),
 question(18,DIAGNOSTICS,'QUAL COMANDO É USADO PARA TESTAR A ALCANÇABILIDADE DE UM DESTINO IP?',
  ['mkdir','ping','copy','format'],1,'O PING NORMALMENTE UTILIZA ICMP PARA TESTAR A ALCANÇABILIDADE.'),
 question(19,SECURITY,'QUAL É A FUNÇÃO DE UM FIREWALL?',
  ['FILTRAR TRÁFEGO CONFORME REGRAS','AUMENTAR O BRILHO DA TELA','SUBSTITUIR O PROCESSADOR','FORMATAR DISCOS AUTOMATICAMENTE'],0,'UM FIREWALL CONTROLA O TRÁFEGO DE REDE COM BASE EM REGRAS.'),
 question(20,FUNDAMENTALS,'EM QUAL TOPOLOGIA OS DISPOSITIVOS SE CONECTAM A UM PONTO CENTRAL?',
  ['BARRAMENTO','ANEL','ESTRELA','MALHA COMPLETA'],2,'NA TOPOLOGIA ESTRELA, OS DISPOSITIVOS SE CONECTAM A UM PONTO CENTRAL.'),
 question(21,FUNDAMENTALS,'O QUE CARACTERIZA UMA REDE LOCAL (LAN)?',
  ['INTERLIGA DISPOSITIVOS EM ÁREA LIMITADA','EXIGE SATÉLITES','COBRE SEMPRE UM PAÍS','DISPENSA PROTOCOLOS'],0,'UMA LAN CONECTA DISPOSITIVOS EM UMA ÁREA LIMITADA, COMO UMA CASA OU ESCOLA.'),
 question(22,FUNDAMENTALS,'QUAL TIPO DE REDE INTERLIGA REDES EM GRANDES DISTÂNCIAS?',
  ['PAN','LAN','WAN','USB'],2,'UMA WAN INTERLIGA REDES EM ÁREAS GEOGRÁFICAS EXTENSAS.'),
 question(23,FUNDAMENTALS,'NO MODELO CLIENTE-SERVIDOR, QUAL É O PAPEL DO SERVIDOR?',
  ['SUBSTITUIR TODOS OS CABOS','FORNECER SERVIÇOS AOS CLIENTES','IMPEDIR TODO ACESSO','APENAS EXIBIR IMAGENS'],1,'O SERVIDOR ATENDE SOLICITAÇÕES DE SERVIÇOS FEITAS PELOS CLIENTES.'),
 question(24,FUNDAMENTALS,'O QUE A LARGURA DE BANDA DE UM LINK REPRESENTA?',
  ['DISTÂNCIA ATÉ O ROTEADOR','QUANTIDADE DE USUÁRIOS','TEMPO DE RESPOSTA','CAPACIDADE DE TRANSMISSÃO'],3,'A LARGURA DE BANDA EXPRESSA CAPACIDADE DE TRANSMISSÃO, NORMALMENTE EM BITS POR SEGUNDO.'),
 question(25,DEVICES,'QUAL É A FUNÇÃO DE UM ACCESS POINT EM UMA LAN?',
  ['FORMATAR DISCOS','CONECTAR CLIENTES SEM FIO','SUBSTITUIR O DNS','CRIAR ENERGIA ELÉTRICA'],1,'UM ACCESS POINT CONECTA CLIENTES SEM FIO À REDE LOCAL.'),
 question(26,DEVICES,'QUAL COMPONENTE CONECTA UM COMPUTADOR AO MEIO DE REDE?',
  ['PLACA DE REDE (NIC)','PLACA DE VÍDEO','PROCESSADOR','MONITOR'],0,'A INTERFACE DE REDE (NIC) PERMITE AO COMPUTADOR ENVIAR E RECEBER DADOS NA REDE.'),
 question(27,DEVICES,'COMO UM HUB ETHERNET TRATA OS BITS RECEBIDOS EM UMA PORTA?',
  ['CONSULTA ROTAS IP','FILTRA POR NOME DNS','REPETE NAS DEMAIS PORTAS','CRIPTOGRAFA OS BITS'],2,'UM HUB REPETE OS SINAIS RECEBIDOS NAS OUTRAS PORTAS, SEM APRENDER ENDEREÇOS MAC.'),
 question(28,MODELS,'QUAL CAMADA OSI FAZ A ENTREGA DE DADOS ENTRE APLICAÇÕES FINAIS?',
  ['FÍSICA','REDE','ENLACE','TRANSPORTE'],3,'A CAMADA DE TRANSPORTE USA PORTAS PARA IDENTIFICAR AS APLICAÇÕES DE ORIGEM E DESTINO.'),
 question(29,MODELS,'NO MODELO TCP/IP DE QUATRO CAMADAS, QUAL TRATA O ENDEREÇAMENTO IP?',
  ['APLICAÇÃO','INTERNET','TRANSPORTE','ACESSO À REDE'],1,'A CAMADA INTERNET DO MODELO TCP/IP TRATA O ENDEREÇAMENTO IP E O ROTEAMENTO.'),
 question(30,MODELS,'O QUE É ENCAPSULAMENTO NA COMUNICAÇÃO EM CAMADAS?',
  ['APAGAR TODOS OS CABEÇALHOS','TROCAR CABOS POR ANTENAS','ADICIONAR CONTROLE AOS DADOS','DUPLICAR ENDEREÇOS IP'],2,'NO ENVIO, AS CAMADAS ADICIONAM CABEÇALHOS E, QUANDO APLICÁVEL, TRAILERS AOS DADOS.'),
 question(31,MEDIA,'QUAL MEIO TRANSMITE DADOS POR PULSOS DE LUZ?',
  ['FIBRA ÓPTICA','PAR TRANÇADO DE COBRE','CABO COAXIAL DE COBRE','RÁDIO WI-FI'],0,'A FIBRA ÓPTICA USA LUZ E NÃO SOFRE INTERFERÊNCIA ELETROMAGNÉTICA COMO O COBRE.'),
 question(32,MEDIA,'POR QUE OS PARES DE UM CABO UTP SÃO TRANÇADOS?',
  ['PARA ATRIBUIR ENDEREÇOS IP','PARA SUBSTITUIR O SWITCH','PARA AUMENTAR A TENSÃO','PARA REDUZIR INTERFERÊNCIAS'],3,'O TRANÇAMENTO AJUDA A REDUZIR INTERFERÊNCIAS E DIAFONIA ENTRE OS PARES.'),
 question(33,SECURITY,'QUAL PRÁTICA MELHORA A SEGURANÇA DAS SENHAS?',
  ['REUTILIZAR A MESMA SENHA','USAR SENHAS LONGAS E ÚNICAS','COMPARTILHAR COM TODOS','MANTER A SENHA PADRÃO'],1,'SENHAS LONGAS E ÚNICAS REDUZEM O RISCO DE ADIVINHAÇÃO E REUTILIZAÇÃO DE CREDENCIAIS VAZADAS.'),
 question(34,SECURITY,'O QUE CARACTERIZA UMA TENTATIVA DE PHISHING?',
  ['MEDIR A LATÊNCIA','ATUALIZAR O SISTEMA','ENGANAR PARA ROUBAR DADOS','TESTAR UM CABO'],2,'PHISHING USA MENSAGENS OU SITES FRAUDULENTOS PARA OBTER DADOS OU INDUZIR AÇÕES.'),
 question(35,SECURITY,'QUAL É O OBJETIVO DO PRINCÍPIO DO MENOR PRIVILÉGIO?',
  ['LIBERAR ACESSO TOTAL','REMOVER TODAS AS SENHAS','DESATIVAR REGISTROS','CONCEDER SÓ O ACESSO NECESSÁRIO'],3,'O MENOR PRIVILÉGIO LIMITA PERMISSÕES AO NECESSÁRIO PARA EXECUTAR UMA TAREFA.'),
 question(36,SECURITY,'POR QUE INSTALAR ATUALIZAÇÕES DE SEGURANÇA?',
  ['CORRIGIR VULNERABILIDADES','AUMENTAR O TAMANHO DO MONITOR','EVITAR QUALQUER BACKUP','TORNAR SENHAS PÚBLICAS'],0,'ATUALIZAÇÕES DE SEGURANÇA CORRIGEM FALHAS QUE PODEM SER EXPLORADAS POR ATACANTES.'),
 question(37,DIAGNOSTICS,'QUAL COMANDO DO WINDOWS MOSTRA A CONFIGURAÇÃO IP LOCAL?',
  ['mkdir','ipconfig','copy','shutdown'],1,'O IPCONFIG EXIBE INFORMAÇÕES COMO ENDEREÇO IP, MÁSCARA E GATEWAY NO WINDOWS.'),
 question(38,DIAGNOSTICS,'QUAL COMANDO DO WINDOWS MOSTRA SALTOS NO CAMINHO ATÉ UM DESTINO?',
  ['format','dir','tracert','rename'],2,'O TRACERT MOSTRA OS SALTOS QUE RESPONDEM ÀS SONDAGENS NO CAMINHO ATÉ O DESTINO.'),
 question(39,DIAGNOSTICS,'QUAL COMANDO CONSULTA REGISTROS DNS PARA UM NOME?',
  ['nslookup','mkdir','format','cls'],0,'O NSLOOKUP CONSULTA SERVIDORES DNS PARA OBTER REGISTROS, COMO ENDEREÇOS DE UM NOME.'),
 question(40,DIAGNOSTICS,'UM TESTE COM PING SEM RESPOSTA PROVA QUE O HOST ESTÁ DESLIGADO?',
  ['SIM, SEMPRE','SIM, SE FOR IPv4','SIM, SE FOR UMA LAN','NÃO, O ICMP PODE SER BLOQUEADO'],3,'A AUSÊNCIA DE RESPOSTA PODE INDICAR FILTRO DE ICMP, FALHA DE ROTA OU OUTROS PROBLEMAS.')
]);

export function validateQuestionBank(bank, warn = true) {
 const valid=[], errors=[], ids=new Set(),statements=new Set();
 if(!Array.isArray(bank)) errors.push('O banco deve ser uma lista.');
 else for(const item of bank){
  const problems=[];
  for(const key of ['id','category','statement','explanation'])if(typeof item?.[key]!=='string'||!item[key].trim())problems.push(key);
  if(ids.has(item?.id))problems.push('ID duplicado');
  const statement=typeof item?.statement==='string'?item.statement.trim().toUpperCase():'';
  if(statement&&statements.has(statement))problems.push('enunciado duplicado');
  if(!Array.isArray(item?.options)||item.options.length!==4||item.options.some(v=>typeof v!=='string'||!v.trim())
   ||new Set(item?.options?.map(v=>typeof v==='string'?v.trim().toUpperCase():v)).size!==4)problems.push('quatro alternativas distintas e não vazias');
  if(!Number.isInteger(item?.correctIndex)||item.correctIndex<0||item.correctIndex>3)problems.push('um único índice correto entre 0 e 3');
  if(problems.length)errors.push(`${item?.id??'SEM ID'}: ${problems.join(', ')}`);
  else {valid.push(item);ids.add(item.id);statements.add(statement);}
 }
 if(warn&&errors.length)console.warn('Banco de perguntas: itens inválidos ignorados.',errors);
 return {valid,errors,ok:errors.length===0};
}
const loaded=validateQuestionBank(QUESTIONS).valid;
export const QUESTION_COUNT=loaded.length;
export function questionRandom(){
 if(globalThis.crypto?.getRandomValues)return globalThis.crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
 return Math.random();
}
function shuffled(values,random){
 const result=[...values];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
export function createQuestionHistory(){return {remaining:[],usedIds:[],history:[],answers:[],cycle:0,lastId:null,nextId:null};}
// Shuffle within categories, then interleave the largest remaining groups.
// Work happens only once per cycle; all QTE kinds consume the same queue.
function shuffledCycle(pool,random,lastId){
 const groups=new Map(),result=[];
 for(const q of shuffled(pool,random)){
  if(!groups.has(q.category))groups.set(q.category,[]);
  groups.get(q.category).push(q.id);
 }
 let previous=pool.find(q=>q.id===lastId)?.category;
 while(groups.size){
  let choices=[...groups].filter(([category])=>category!==previous);
  if(!choices.length)choices=[...groups];
  const largest=Math.max(...choices.map(([,ids])=>ids.length));
  choices=choices.filter(([,ids])=>ids.length===largest);
  const [category,ids]=choices[Math.floor(random()*choices.length)];
  const index=!result.length&&ids.at(-1)===lastId&&ids.length>1?0:ids.length-1;
  result.push(ids.splice(index,1)[0]);previous=category;
  if(!ids.length)groups.delete(category);
 }
 return result;
}
export function initializeQuestionCycle(history=gameState.questionBank,random=questionRandom){
 history.remaining=shuffledCycle(loaded,random,history.lastId);
 history.usedIds=[];history.cycle++;
}
export function createQuestion(sequence,kind='attack',matchId=0,history=gameState.questionBank,random=questionRandom,bank=loaded){
 const valid=bank===loaded?loaded:validateQuestionBank(bank).valid;
 const pool=valid.length?valid:[QUESTIONS[0]]; // Safe networking fallback for damaged external banks.
 const byId=new Map(pool.map(q=>[q.id,q]));
 history.remaining=history.remaining.filter(id=>byId.has(id));
 if(!history.remaining.length){
  history.remaining=shuffledCycle(pool,random,history.lastId);history.usedIds=[];history.cycle++;
  if(history.remaining.length>1&&history.remaining[0]===history.lastId)[history.remaining[0],history.remaining[1]]=[history.remaining[1],history.remaining[0]];
 }
 const requested=history.remaining.indexOf(history.nextId);
 const [id]=history.remaining.splice(requested>=0?requested:0,1);history.nextId=null;
 const source=byId.get(id),order=shuffled([0,1,2,3],random);
 history.lastId=id;history.usedIds.push(id);history.history.push({id,cycle:history.cycle,sequence,kind});
 const options=order.map(i=>source.options[i]),correctIndex=order.indexOf(source.correctIndex);
 return {...source,bankId:id,id:`${kind}-${matchId}-${sequence}-${id}`,kind,options,correctIndex,
  alternatives:ANSWER_LABELS,correctAnswer:ANSWER_LABELS[correctIndex],timeLimit:10};
}
