import { gameState } from './gameState.js';

export const DEBUG_QTE = false;
export const ANSWER_LABELS = Object.freeze(['A','B','C','D']);
const question = (number, category, statement, options, correctIndex, explanation) => Object.freeze({
 id:`net-${String(number).padStart(2,'0')}`, category, statement,
 options:Object.freeze(options), correctIndex, explanation
});
export const QUESTIONS = Object.freeze([
 question(1,'MODELO OSI','QUAL CAMADA DO MODELO OSI É RESPONSÁVEL PELO ROTEAMENTO ENTRE REDES?',
  ['Física','Enlace de Dados','Rede','Aplicação'],2,'A CAMADA DE REDE REALIZA O ENCAMINHAMENTO DE PACOTES ENTRE REDES.'),
 question(2,'MODELO OSI','QUANTAS CAMADAS POSSUI O MODELO OSI?',
  ['4','5','6','7'],3,'O MODELO OSI POSSUI SETE CAMADAS.'),
 question(3,'TCP/IP','QUAL PROTOCOLO OFERECE ENTREGA CONFIÁVEL E ORDENADA DE DADOS?',
  ['UDP','TCP','IP','ARP'],1,'O TCP UTILIZA CONFIRMAÇÕES E RETRANSMISSÕES PARA OFERECER ENTREGA CONFIÁVEL.'),
 question(4,'IPv4','QUANTOS BITS POSSUI UM ENDEREÇO IPv4?',
  ['16','32','64','128'],1,'UM ENDEREÇO IPv4 POSSUI 32 BITS.'),
 question(5,'IPv6','QUANTOS BITS POSSUI UM ENDEREÇO IPv6?',
  ['32','48','64','128'],3,'UM ENDEREÇO IPv6 POSSUI 128 BITS.'),
 question(6,'MÁSCARA DE SUB-REDE','QUAL MÁSCARA CORRESPONDE AO PREFIXO IPv4 /24?',
  ['255.0.0.0','255.255.0.0','255.255.255.0','255.255.255.252'],2,'O PREFIXO /24 INDICA 24 BITS DE REDE.'),
 question(7,'ENDEREÇAMENTO','QUAL DESTES ENDEREÇOS IPv4 É PRIVADO?',
  ['8.8.8.8','192.168.1.10','1.1.1.1','9.9.9.9'],1,'A FAIXA 192.168.0.0/16 É RESERVADA PARA REDES PRIVADAS.'),
 question(8,'DNS','QUAL É A PRINCIPAL FUNÇÃO DO DNS?',
  ['DISTRIBUIR ENERGIA','TRADUZIR NOMES DE DOMÍNIO EM ENDEREÇOS IP','CRIPTOGRAFAR DISCOS','CONTROLAR MONITORES'],1,'O DNS PERMITE RESOLVER NOMES DE DOMÍNIO EM ENDEREÇOS IP.'),
 question(9,'DHCP','QUAL SERVIÇO ATRIBUI CONFIGURAÇÕES IP AUTOMATICAMENTE?',
  ['FTP','DNS','DHCP','SMTP'],2,'O DHCP FORNECE CONFIGURAÇÕES COMO ENDEREÇO IP E GATEWAY.'),
 question(10,'HTTPS','O QUE DIFERENCIA O HTTPS DO HTTP COMUM?',
  ['NÃO UTILIZA REDE','UTILIZA TLS PARA PROTEGER A COMUNICAÇÃO','FUNCIONA APENAS EM IPv6','DISPENSA SERVIDORES'],1,'O HTTPS UTILIZA TLS PARA PROTEGER A COMUNICAÇÃO.'),
 question(11,'HTTP','QUAL É A PORTA PADRÃO DO HTTP?',
  ['21','22','80','443'],2,'A PORTA PADRÃO DO HTTP É A TCP 80.'),
 question(12,'SWITCH','QUAL DISPOSITIVO ENCAMINHA QUADROS ETHERNET USANDO ENDEREÇOS MAC?',
  ['SWITCH','MONITOR','IMPRESSORA','TECLADO'],0,'SWITCHES ETHERNET UTILIZAM ENDEREÇOS MAC PARA ENCAMINHAR QUADROS.'),
 question(13,'ROTEADOR','QUAL É A PRINCIPAL FUNÇÃO DE UM ROTEADOR?',
  ['EXIBIR IMAGENS','INTERLIGAR REDES E ENCAMINHAR PACOTES','ARMAZENAR SENHAS','SUBSTITUIR CABOS USB'],1,'ROTEADORES ENCAMINHAM PACOTES ENTRE DIFERENTES REDES.'),
 question(14,'ENDEREÇO MAC','QUAL É O TAMANHO MAIS COMUM DE UM ENDEREÇO MAC ETHERNET?',
  ['16 BITS','32 BITS','48 BITS','128 BITS'],2,'ENDEREÇOS MAC ETHERNET TRADICIONAIS POSSUEM 48 BITS.'),
 question(15,'ARP','PARA QUE SERVE O ARP EM UMA REDE IPv4 LOCAL?',
  ['RESOLVER IPv4 EM ENDEREÇO MAC','CRIAR SENHAS','COMPACTAR ARQUIVOS','ENVIAR E-MAILS'],0,'O ARP DESCOBRE O ENDEREÇO MAC ASSOCIADO A UM IPv4 NA REDE LOCAL.'),
 question(16,'NAT','QUAL É UMA FUNÇÃO COMUM DO NAT?',
  ['AUMENTAR A MEMÓRIA RAM','TRADUZIR ENDEREÇOS IP','CRIAR CABOS DE REDE','SUBSTITUIR O DNS'],1,'O NAT TRADUZ ENDEREÇOS IP ENTRE CONTEXTOS DE REDE.'),
 question(17,'WI-FI','QUAL PADRÃO É ASSOCIADO ÀS REDES WI-FI?',
  ['IEEE 802.11','HDMI','SATA','USB'],0,'A FAMÍLIA IEEE 802.11 DEFINE TECNOLOGIAS DE REDES WI-FI.'),
 question(18,'DIAGNÓSTICO','QUAL COMANDO É USADO PARA TESTAR A ALCANÇABILIDADE DE UM DESTINO IP?',
  ['mkdir','ping','copy','format'],1,'O PING NORMALMENTE UTILIZA ICMP PARA TESTAR A ALCANÇABILIDADE.'),
 question(19,'SEGURANÇA','QUAL É A FUNÇÃO DE UM FIREWALL?',
  ['FILTRAR TRÁFEGO CONFORME REGRAS','AUMENTAR O BRILHO DA TELA','SUBSTITUIR O PROCESSADOR','FORMATAR DISCOS AUTOMATICAMENTE'],0,'UM FIREWALL CONTROLA O TRÁFEGO DE REDE COM BASE EM REGRAS.'),
 question(20,'TOPOLOGIAS','EM QUAL TOPOLOGIA OS DISPOSITIVOS SE CONECTAM A UM PONTO CENTRAL?',
  ['BARRAMENTO','ANEL','ESTRELA','MALHA COMPLETA'],2,'NA TOPOLOGIA ESTRELA, OS DISPOSITIVOS SE CONECTAM A UM PONTO CENTRAL.')
]);

export function validateQuestionBank(bank, warn = true) {
 const valid=[], errors=[], ids=new Set();
 if(!Array.isArray(bank)) errors.push('O banco deve ser uma lista.');
 else for(const item of bank){
  const problems=[];
  for(const key of ['id','category','statement','explanation'])if(typeof item?.[key]!=='string'||!item[key].trim())problems.push(key);
  if(ids.has(item?.id))problems.push('ID duplicado');
  if(!Array.isArray(item?.options)||item.options.length!==4||item.options.some(v=>typeof v!=='string'||!v.trim())
   ||new Set(item?.options?.map(v=>typeof v==='string'?v.trim().toUpperCase():v)).size!==4)problems.push('quatro alternativas distintas e não vazias');
  if(!Number.isInteger(item?.correctIndex)||item.correctIndex<0||item.correctIndex>3)problems.push('um único índice correto entre 0 e 3');
  if(problems.length)errors.push(`${item?.id??'SEM ID'}: ${problems.join(', ')}`);
  else {valid.push(item);ids.add(item.id);}
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
export function createQuestion(sequence,kind='attack',matchId=0,history=gameState.questionBank,random=questionRandom,bank=loaded){
 const valid=bank===loaded?loaded:validateQuestionBank(bank).valid;
 const pool=valid.length?valid:[QUESTIONS[0]]; // Safe networking fallback for damaged external banks.
 const byId=new Map(pool.map(q=>[q.id,q]));
 history.remaining=history.remaining.filter(id=>byId.has(id));
 if(!history.remaining.length){
  history.remaining=shuffled([...byId.keys()],random);history.usedIds=[];history.cycle++;
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
