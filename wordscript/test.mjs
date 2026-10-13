import assert from 'node:assert/strict';
import fs from 'node:fs';
import {run,parseNumber,compare,LanguageError} from './wordscript.mjs';
const print=e=>`print OpenParanthesis ${e} CloseParanthesis SemiColon`;
const cases=[
  ['same magnitude different spelling',print('Four Zero EqualEqual Forty'),['false']],
  ['403 inequality',print('Fourty Three NotEqual Four Zero Three'),['true']],
  ['joined compound',print('FourtyFour'),['44']],
  ['space changes magnitude',print('Fourty Four'),['404']],
  ['age passes',print('input OpenParanthesis "age" CloseParanthesis GreaterThanOrEqual Fourty Three'),['true'],{inputs:{age:'Fourty Four'}}],
  ['age fails',print('input OpenParanthesis "age" CloseParanthesis GreaterThanOrEqual Fourty Three'),['false'],{inputs:{age:'Four Four'}}],
  ['compound unequal to digits',print('FourtyFour EqualEqual Four Four'),['false']],
  ['alias equal',print('Forty EqualEqual Fourty'),['true']],
  ['prefix ordering',print('Four LessThan Four Zero'),['true']],
  ['numeric normalization',print('value OpenParanthesis Four Zero CloseParanthesis EqualEqual Forty'),['true']],
  ['addition canonicalizes',print('Four Zero Plus Zero EqualEqual Forty'),['true']],
  ['short circuit',print('false And missing'),['false']],
  ['zero divisor',print('One Divide Zero'),'Divide by zero'],
  ['missing variable',print('missing'),'Unbound missing'],
  ['type error before right evaluation',print('true Plus missing'),'Expected number'],
  ['missing input',print('input OpenParanthesis "age" CloseParanthesis'),'Missing input age'],
  ['invalid input spelling',print('input OpenParanthesis "age" CloseParanthesis'),'Invalid number spelling',{inputs:{age:'forty'}}],
  ['execution bound','while OpenParanthesis true CloseParanthesis OpenBrace CloseBrace','Execution limit exceeded',{limit:20}],
  ['const reassignment','const x Equals One SemiColon x Equals Two SemiColon','Constant x'],
  ['unclosed block','if OpenParanthesis true CloseParanthesis OpenBrace','Unclosed block'],
  ['negative division',print('Minus Seven Divide Two'),['-3']],
];
const examples=new URL('./examples/',import.meta.url);
for(const [file,inputs,expected] of [
 ['sum.wordjs',{n:'Five'},['15']],['sum.wordjs',{n:'Zero'},['0']],
 ['factorial.wordjs',{n:'Five'},['120']],['factorial.wordjs',{n:'Zero'},['1']],
])cases.push([`${file} ${inputs.n}`,fs.readFileSync(new URL(file,examples),'utf8'),expected,{inputs}]);
for(const [name,source,expected,options] of cases){
  if(typeof expected==='string')assert.throws(()=>run(source,options),e=>e instanceof LanguageError&&e.message===expected,name);
  else assert.deepEqual(run(source,options).output,expected,name);
}
assert.equal(parseNumber('Fourty Four').value,404n);
assert.equal(compare(parseNumber('Four Zero'),parseNumber('Forty')),-1);
console.log(`${cases.length} program cases and 2 direct assertions passed`);
// Temporary copy of the interpreter with exactly one semantic rule changed.
const original=new URL('./wordscript.mjs',import.meta.url);
const mutant=new URL('./.mutation-temp.mjs',import.meta.url);
const source=fs.readFileSync(original,'utf8');
assert.equal(source.split("comparison='components'").length,2);
try{
  fs.writeFileSync(mutant,source.replace("comparison='components'","comparison='numeric'"),{flag:'wx'});
  const mutated=await import(mutant.href);
  const witness=print('Four Zero EqualEqual Forty');
  assert.deepEqual(run(witness).output,['false']);
  assert.deepEqual(mutated.run(witness).output,['true']);
  assert.throws(()=>assert.deepEqual(mutated.run(witness).output,['false']),assert.AssertionError);
  console.log('Mutation detected: numeric equality incorrectly makes Four Zero == Forty true');
}finally{if(fs.existsSync(mutant))fs.unlinkSync(mutant);}
