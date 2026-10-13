import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export class LanguageError extends Error {}
const units = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
const teens = ['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens = {Twenty:20,Thirty:30,Forty:40,Fourty:40,Fifty:50,Sixty:60,Seventy:70,Eighty:80,Ninety:90};
function component(word) {
  if (units.includes(word)) return units.indexOf(word);
  if (teens.includes(word)) return teens.indexOf(word)+10;
  if (word in tens) return tens[word];
  for (const [prefix,n] of Object.entries(tens)) {
    const rest=word.slice(prefix.length);
    if(word.startsWith(prefix)&&units.slice(1).includes(rest)) return n+units.indexOf(rest);
  }
  // Original concatenated digit spelling remains valid: FourZeroThree is 403.
  const parts=word.match(/Zero|One|Two|Three|Four|Five|Six|Seven|Eight|Nine/g);
  if(parts?.join('')===word) return BigInt(parts.map(p=>units.indexOf(p)).join(''));
  return null;
}
export function number(parts) {
  const components=parts.map(BigInt);
  return {kind:'number', components, value:BigInt(components.map(String).join(''))};
}
export function parseNumber(text) {
  if(typeof text!=='string'||!text.trim()) throw new LanguageError('Expected number spelling');
  const parts=text.trim().split(/[ \t]+/).map(component);
  if(parts.some(n=>n===null)) throw new LanguageError('Invalid number spelling');
  return number(parts);
}
const symbols={OpenParanthesis:'(',CloseParanthesis:')',OpenParenthesis:'(',CloseParenthesis:')',OpenBrace:'{',CloseBrace:'}',SemiColon:';',Equals:'=',Plus:'+',Minus:'-',Multiply:'*',Divide:'/',Modulo:'%',LessThan:'<',GreaterThan:'>',LessThanOrEqual:'<=',GreaterThanOrEqual:'>=',EqualEqual:'==',StrictEquals:'==',NotEqual:'!=',StrictNotEquals:'!=',And:'&&',Or:'||',Not:'!',PlusEquals:'+=',MinusEquals:'-=',Dot:'.'};
function lex(source) {
  const tokens=[]; let i=0;
  while(i<source.length) {
    if(/\s/.test(source[i])) {i++;continue;}
    if(source.startsWith('//',i)) {const end=source.indexOf('\n',i);i=end<0?source.length:end;continue;}
    if(source.startsWith('/*',i)) {const end=source.indexOf('*/',i+2);if(end<0)throw new LanguageError('Unclosed comment');i=end+2;continue;}
    if(source[i]==='"') {
      const start=i++;let closed=false;
      while(i<source.length){if(source[i]==='\\'){i+=2;continue;}if(source[i++]==='"'){closed=true;break;}}
      if(!closed)throw new LanguageError('Unclosed string');
      try{tokens.push({type:'string',value:JSON.parse(source.slice(start,i))});}catch{throw new LanguageError('Invalid string');}continue;
    }
    const match=/^[A-Za-z_][A-Za-z_0-9]*/.exec(source.slice(i));
    if(!match)throw new LanguageError(`Unexpected character at offset ${i}: spell punctuation and numbers`);
    const word=match[0];i+=word.length;
    const n=component(word);
    if(n!==null){
      const parts=[n];
      // Horizontal whitespace joins components. A newline ends the literal.
      while(true){const next=/^[ \t]+([A-Za-z_][A-Za-z_0-9]*)/.exec(source.slice(i));if(!next)break;const v=component(next[1]);if(v===null)break;parts.push(v);i+=next[0].length;}
      tokens.push({type:'number',value:number(parts)});
    }else tokens.push({type:'word',value:symbols[word]??word});
  }
  tokens.push({type:'eof',value:'<eof>'});return tokens;
}
export function parse(source) {
  const tokens=lex(source);let i=0,depth=0;
  const peek=()=>tokens[i].value;
  const take=v=>{if(peek()!==v)throw new LanguageError(`Expected ${v}, got ${String(peek())}`);return tokens[i++];};
  const identifier=()=>{const t=tokens[i++];if(t.type!=='word'||!/^[A-Za-z_][A-Za-z_0-9]*$/.test(t.value)||['let','const','if','else','while','true','false','print','input','value'].includes(t.value))throw new LanguageError('Expected identifier');return t.value;};
  const precedence={'||':1,'&&':2,'==':3,'!=':3,'<':4,'>':4,'<=':4,'>=':4,'+':5,'-':5,'*':6,'/':6,'%':6};
  function expression(min=0){
    if(++depth>200)throw new LanguageError('Expression nesting limit');
    let left;const t=tokens[i++];
    if(t.type==='number'||t.type==='string')left={type:'literal',value:t.value};
    else if(t.value==='true'||t.value==='false')left={type:'literal',value:t.value==='true'};
    else if(t.value==='('){left=expression();take(')');}
    else if(t.value==='!'||t.value==='-')left={type:'unary',op:t.value,arg:expression(7)};
    else if(t.value==='input'||t.value==='value'){take('(');const arg=expression();take(')');left={type:'call',name:t.value,arg};}
    else if(t.type==='word'&&/^[A-Za-z_][A-Za-z_0-9]*$/.test(t.value))left={type:'variable',name:t.value};
    else throw new LanguageError('Expected expression');
    while(precedence[peek()]!==undefined&&precedence[peek()]>=min){const op=tokens[i++].value;left={type:'binary',op,left,right:expression(precedence[op]+1)};}
    depth--;return left;
  }
  function block(){take('{');const body=[];while(peek()!=='}'){if(tokens[i].type==='eof')throw new LanguageError('Unclosed block');body.push(statement());}take('}');return body;}
  function statement(){
    if(++depth>200)throw new LanguageError('Statement nesting limit');
    let result;const token=peek();
    if(token==='let'||token==='const'){i++;const name=identifier();take('=');const expr=expression();take(';');result={type:'declare',name,expr,constant:token==='const'};}
    else if(token==='if'||token==='while'){i++;take('(');const test=expression();take(')');const body=block();let otherwise=[];if(token==='if'&&peek()==='else'){i++;otherwise=block();}result={type:token,test,body,otherwise};}
    else if(token==='print'||token==='console'){i++;if(token==='console'){take('.');take('log');}take('(');const expr=expression();take(')');take(';');result={type:'print',expr};}
    else {const name=identifier();const op=tokens[i++].value;if(!['=','+=','-='].includes(op))throw new LanguageError('Expected assignment');const expr=expression();take(';');result={type:'assign',name,op,expr};}
    depth--;return result;
  }
  const body=[];while(tokens[i].type!=='eof')body.push(statement());return {type:'program',body};
}
function requireNumber(v){if(v?.kind!=='number')throw new LanguageError('Expected number');return v;}
function requireBool(v){if(typeof v!=='boolean')throw new LanguageError('Expected boolean');return v;}
const canonical=v=>({kind:'number',components:[v],value:v});
export function compare(a,b,mode='components') {
  requireNumber(a);requireNumber(b);
  if(mode==='numeric')return a.value<b.value?-1:a.value>b.value?1:0;
  for(let i=0;i<Math.min(a.components.length,b.components.length);i++){
    if(a.components[i]!==b.components[i])return a.components[i]<b.components[i]?-1:1;
  }
  return Math.sign(a.components.length-b.components.length);
}
export function run(source,{inputs={},limit=10000,comparison='components'}={}) {
  if(!Number.isSafeInteger(limit)||limit<1)throw new LanguageError('Invalid execution limit');
  if(!['components','numeric'].includes(comparison))throw new LanguageError('Invalid comparison mode');
  if(source.length>100000)throw new LanguageError('Source size limit');
  const ast=parse(source),output=[],env=new Map();let steps=0;
  function tick(){if(++steps>limit)throw new LanguageError('Execution limit exceeded');}
  function arithmetic(op,a,b){
    const x=requireNumber(a).value,y=requireNumber(b).value;
    if((op==='/'||op==='%')&&y===0n)throw new LanguageError('Divide by zero');
    const v=op==='+'?x+y:op==='-'?x-y:op==='*'?x*y:op==='/'?x/y:x%y;
    if(v.toString().length>1000)throw new LanguageError('Number size limit');
    return canonical(v);
  }
  function evaluate(e){
    tick();
    if(e.type==='literal')return e.value;
    if(e.type==='variable'){if(!env.has(e.name))throw new LanguageError(`Unbound ${e.name}`);return env.get(e.name).value;}
    if(e.type==='call'){
      const arg=evaluate(e.arg);
      if(e.name==='value')return canonical(requireNumber(arg).value);
      if(typeof arg!=='string')throw new LanguageError('Input name must be a string');
      if(!Object.hasOwn(inputs,arg))throw new LanguageError(`Missing input ${arg}`);
      return parseNumber(inputs[arg]);
    }
    if(e.type==='unary'){const a=evaluate(e.arg);return e.op==='!'?!requireBool(a):canonical(-requireNumber(a).value);}
    const a=evaluate(e.left);
    if(e.op==='&&')return requireBool(a)?requireBool(evaluate(e.right)):false;
    if(e.op==='||')return requireBool(a)?true:requireBool(evaluate(e.right));
    requireNumber(a);const b=requireNumber(evaluate(e.right));
    if(['+','-','*','/','%'].includes(e.op))return arithmetic(e.op,a,b);
    const c=compare(a,b,comparison);
    return e.op==='=='?c===0:e.op==='!='?c!==0:e.op==='<'?c<0:e.op==='>'?c>0:e.op==='<='?c<=0:c>=0;
  }
  function execute(body){for(const s of body){tick();
    if(s.type==='declare'){if(env.has(s.name))throw new LanguageError(`Already bound ${s.name}`);env.set(s.name,{value:evaluate(s.expr),constant:s.constant});}
    else if(s.type==='assign'){const binding=env.get(s.name);if(!binding)throw new LanguageError(`Unbound ${s.name}`);if(binding.constant)throw new LanguageError(`Constant ${s.name}`);binding.value=s.op==='='?evaluate(s.expr):arithmetic(s.op[0],binding.value,evaluate(s.expr));}
    else if(s.type==='print'){const v=evaluate(s.expr);output.push(v?.kind==='number'?v.value.toString():String(v));}
    else if(s.type==='if')execute(requireBool(evaluate(s.test))?s.body:s.otherwise);
    else if(s.type==='while')while(requireBool(evaluate(s.test)))execute(s.body);
  }}
  execute(ast.body);return {output,env,steps};
}
export const stringify=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x,2);
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [command,file,...args]=process.argv.slice(2);
    if(!['run','ast'].includes(command)||!file)throw new LanguageError('Usage: node wordscript.mjs run|ast file.wordjs [name="Fourty Four"] [--limit=10000]');
    const source=fs.readFileSync(file,'utf8');const inputs={};let limit=10000;
    for(const arg of args){const at=arg.indexOf('=');if(at<1)throw new LanguageError('Expected name=value');const k=arg.slice(0,at),v=arg.slice(at+1);if(k==='--limit')limit=Number(v);else inputs[k]=v;}
    if(command==='ast')console.log(stringify(parse(source)));
    else for(const line of run(source,{inputs,limit}).output)console.log(line);
  }catch(error){console.error(`WordScript: ${error.message}`);process.exitCode=1;}
}
