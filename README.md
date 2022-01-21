# File Share
file share e um software para o envio de arquivos entre pessoas

esse projeto foi feito com fins de **aprendizado**

## Como usar?

antes de usar e necessário você ter um usuário, crie um com:

```console
$ node app.js -U SrAnonimo13 -P 12345
```

essas informações serão usadas para verificação e identificação!

fazendo isso você já tem uma "conta" agora e so enviar seu arquivo ou receber de outras pessoas

## Enviar arquivos!
para enviar seus arquivos e muito simples, use:

```console
$ node app.js -S arquivo.txt 
```

é você já esta compartilhando seu arquivo para seus amigos

## Abaixar arquivos!
também e muito simples, use:
```console
$ node app.js -G MeuAmigoMuitoLegal -UP senhaDoMeuAmigoMuitoLegal123
```

e assim o download começara!

e possível tambem mudar o local aonde o arquivo sera abaixado

```console
$ node app.js -FP meusArquivosSecretos/segredos
```

e tambem você pode mudar o nome do arquivo

```console
$ node app.js -FN naoVejaIssoMamae
```