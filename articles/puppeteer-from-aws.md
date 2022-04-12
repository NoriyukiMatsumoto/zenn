---
title: "AWS Lambdaコンテナでpuppeteerを動かす"
emoji: "📘"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["puppeteer","AWS"]
published: true
---

## 概要
AWSは、Lambdaのコンテナイメージを作成してpuppeteerを動かす手順を示します。

## AWSでPuppeteerを動かす
コードはこちら
https://github.com/NoriyukiMatsumoto/zenn/tree/main/articles/puppeteer-from-aws/puppeteer-aws-sample
### 「AWS SAM CLI」をインストール
https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/serverless-sam-cli-install-mac.html

### `sam init` コマンドでプロジェクトを生成
```bash
$ sam init

You can preselect a particular runtime or package type when using the `sam init` experience.
Call `sam init --help` to learn more.

Which template source would you like to use?
        1 - AWS Quick Start Templates
        2 - Custom Template Location
Choice: 1

Choose an AWS Quick Start application template
        1 - Hello World Example
        2 - Multi-step workflow
        3 - Serverless API
        4 - Scheduled task
        5 - Standalone function
        6 - Data processing
        7 - Infrastructure event management
        8 - Machine Learning
Template: 1

 Use the most popular runtime and package type? (Python and zip) [y/N]: N

Which runtime would you like to use?
        1 - dotnet6
        2 - dotnet5.0
        3 - dotnetcore3.1
        4 - go1.x
        5 - java11
        6 - java8.al2
        7 - java8
        8 - nodejs14.x
        9 - nodejs12.x
        10 - python3.9
        11 - python3.8
        12 - python3.7
        13 - python3.6
        14 - ruby2.7
Runtime: 8

What package type would you like to use?
        1 - Zip
        2 - Image
Package type: 2

Based on your selections, the only dependency manager available is npm.
We will proceed copying the template using npm.

Project name [sam-app]: puppeteer-aws-sample

Cloning from https://github.com/aws/aws-sam-cli-app-templates (process may take a moment)

    -----------------------
    Generating application:
    -----------------------
    Name: puppeteer-aws-sample
    Base Image: amazon/nodejs14.x-base
    Architectures: x86_64
    Dependency Manager: npm
    Output Directory: .
    Next steps can be found in the README file at ./puppeteer-aws-sample/README.md
    

    Commands you can use next
    =========================
    [*] Create pipeline: cd puppeteer-aws-sample && sam pipeline init --bootstrap
    [*] Test Function in the Cloud: sam sync --stack-name {stack-name} --watch
    

SAM CLI update available (1.46.0); (1.41.0 installed)
To download: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
```

`What package type would you like to use?` では、`2 - Image` を選択してください。
zipでは、250MB制限があるため、puppeteerをインストールしたプロジェクトは250MBを超えるためデプロイできません。
https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/gettingstarted-limits.html

動かすには、Layerを使用する等の工夫が必要です。
https://dev.classmethod.jp/articles/run-headless-chrome-puppeteer-on-aws-lambda/

### puppeteerをインストール
```bash
$ cd puppeteer-aws-sample/hello-world
$ npm install puppeteer
```

### app.jsを修正
作成した、`puppeteer-aws-sample/hello-world/app.js` をpuppeteerを利用したコードに修正します。
`http://example.com/` にアクセスして、`body > div > h1` の文字をレスポンスとして返すコードに修正します。
```js
const puppeteer = require("puppeteer");

exports.lambdaHandler = async (event, context) => {
  let response;
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "-–disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });
    const page = await browser.newPage();
    await page.goto("http://example.com/");
    const element = await page.$("body > div > h1");
    const value = await (await element.getProperty("textContent"))?.jsonValue();

    await browser.close();
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: value,
      }),
    };
  } catch (err) {
    console.log(err);
    return err;
  }

  return response;
};

```

### Dockerfileを修正
参考：https://qiita.com/moritalous/items/133bb2c132abce6530e7

```Dockerfile
FROM public.ecr.aws/lambda/nodejs:14

RUN yum -y install libX11 libXcomposite libXcursor libXdamage libXext libXi libXtst cups-libs libXScrnSaver libXrandr alsa-lib pango atk at-spi2-atk gtk3 google-noto-sans-japanese-fonts
COPY app.js package*.json ./

RUN npm install
# If you are building your code for production, instead include a package-lock.json file on this directory and use:
# RUN npm ci --production

# Command can be overwritten by providing a different command in the template directly.
CMD ["app.lambdaHandler"]

```

### template.yamlを修正
puppeteerを動かすので、TimeoutとMemorySizeを修正します。
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  puppeteer-aws-sample

  Sample SAM Template for puppeteer-aws-sample
  
# More info about Globals: https://github.com/awslabs/serverless-application-model/blob/master/docs/globals.rst
Globals:
  Function:
    Timeout: 180 # 修正

Resources:
  HelloWorldFunction:
    Type: AWS::Serverless::Function
    Properties:
      MemorySize: 1600 # 追加
      PackageType: Image
      Architectures:
        - x86_64
      Events:
        HelloWorld:
          Type: Api
          Properties:
            Path: /hello
            Method: get
    Metadata:
      DockerTag: nodejs14.x-v1
      DockerContext: ./hello-world
      Dockerfile: Dockerfile

Outputs:
  # ServerlessRestApi is an implicit API created out of Events key under Serverless::Function
  # Find out more about other implicit resources you can reference within SAM
  # https://github.com/awslabs/serverless-application-model/blob/master/docs/internals/generated_resources.rst#api
  HelloWorldApi:
    Description: "API Gateway endpoint URL for Prod stage for Hello World function"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/hello/"
  HelloWorldFunction:
    Description: "Hello World Lambda Function ARN"
    Value: !GetAtt HelloWorldFunction.Arn
  HelloWorldFunctionIamRole:
    Description: "Implicit IAM Role created for Hello World function"
    Value: !GetAtt HelloWorldFunctionRole.Arn

```

### ローカルで動かす
デプロイを実行する前に、ローカルで動作確認します。

```bash
$ cd ./puppeteer-aws-sample
$ sam build
Your template contains a resource with logical ID "ServerlessRestApi", which is a reserved logical ID in AWS SAM. It could result in unexpected behaviors and is not recommended.
~割愛~
Commands you can use next
=========================
[*] Invoke Function: sam local invoke
[*] Test Function in the Cloud: sam sync --stack-name {stack-name} --watch
[*] Deploy: sam deploy --guided
$ sam local start-api
```

`http://127.0.0.1:3000/hello` にアクセスしてみます。

```bash
$ curl http://127.0.0.1:3000/hello
{"message":"Example Domain"}  
```

`Example Domain` という文字列が出力されれば成功です。

### デプロイ
```bash
$ sam deploy --guided

Configuring SAM deploy
======================

        Looking for config file [samconfig.toml] :  Not found

        Setting default arguments for 'sam deploy'
        =========================================
        Stack Name [sam-app]: puppeteer-aws-sample
        AWS Region [ap-northeast-1]: 
        #Shows you resources changes to be deployed and require a 'Y' to initiate deploy
        Confirm changes before deploy [y/N]: 
        #SAM needs permission to be able to create roles to connect to the resources in your template
        Allow SAM CLI IAM role creation [Y/n]: 
        #Preserves the state of previously provisioned resources when an operation fails
        Disable rollback [y/N]: 
        HelloWorldFunction may not have authorization defined, Is this okay? [y/N]: y
        Save arguments to configuration file [Y/n]: 
        SAM configuration file [samconfig.toml]: 
        SAM configuration environment [default]: 

        Looking for resources needed for deployment:
         Managed S3 bucket: aws-sam-cli-managed-default-samclisourcebucket-18nh8nczmdjo9
         A different default S3 bucket can be set in samconfig.toml
         Image repositories: Not found.
         #Managed repositories will be deleted when their functions are removed from the template and deployed
         Create managed ECR repositories for all functions? [Y/n]: 

        Saved arguments to config file
        Running 'sam deploy' for future deployments will use the parameters saved above.
        The above parameters can be changed by modifying samconfig.toml
        Learn more about samconfig.toml syntax at 
        https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html

~割愛~

-------------------------------------------------------------------------------------------------
Outputs                                                                                         
-------------------------------------------------------------------------------------------------
Key                 HelloWorldFunctionIamRole                                                   
Description         Implicit IAM Role created for Hello World function                          
Value               arn:aws:iam::***puppeteer-aws-sample-                        
HelloWorldFunctionRole-1XOL7H54HZF7T                                                            

Key                 HelloWorldApi                                                               
Description         API Gateway endpoint URL for Prod stage for Hello World function            
Value               https://nspcysjiqf.execute-api.ap-northeast-1.amazonaws.com/Prod/hello/     

Key                 HelloWorldFunction                                                          
Description         Hello World Lambda Function ARN                                             
Value               arn:aws:lambda:ap-northeast-1:**********:function:puppeteer-aws-sample-   
HelloWorldFunction-NwPGqax5PdU8                                                                 
-------------------------------------------------------------------------------------------------

Successfully created/updated stack - puppeteer-aws-sample in ap-northeast-1
```
`API Gateway endpoint URL for Prod stage for Hello World function` で指定されているURLにアクセスすると、動作を確認できます。

```bash
$ curl https://nspcysjiqf.execute-api.ap-northeast-1.amazonaws.com/Prod/hello/
{"message":"Example Domain"}
```

### 後片付け
`sam delete`コマンドでリソースを削除します。
```bash
$ sam delete
        Are you sure you want to delete the stack puppeteer-aws-sample in the region ap-northeast-1 ? [y/N]: y
        Are you sure you want to delete the folder puppeteer-aws-sample in S3 which contains the artifacts? [y/N]: y
        Found ECR Companion Stack puppeteer-aws-sample-49d1b813-CompanionStack
        Do you you want to delete the ECR companion stack puppeteer-aws-sample-49d1b813-CompanionStack in the region ap-northeast-1 ? [y/N]: y
        ECR repository puppeteerawssample49d1b813/helloworldfunction19d43fc4repo may not be empty. Do you want to delete the repository and all the images in it ? [y/N]: y
        - Deleting ECR repository puppeteerawssample49d1b813/helloworldfunction19d43fc4repo
        - Deleting ECR Companion Stack puppeteer-aws-sample-49d1b813-CompanionStack
        - Deleting S3 object with key puppeteer-aws-sample/84c120966bcdef1ef520108b81b9254b.template
        - Deleting Cloudformation stack puppeteer-aws-sample

Deleted successfully
```

## 終わりに
lambdaでコンテナイメージを利用すれば、簡単にpuppeteerを動かすことができました。
今回APIゲートウェイを使用して、lambdaを利用しましたが、APIゲートウェイは最大タイムアウトが30秒ですので、処理が30秒で終わるようにする必要があります。
https://aws.amazon.com/jp/premiumsupport/knowledge-center/api-gateway-504-errors/#:~:text=%E6%B3%A8%3A%20API%20Gateway%20%E3%81%AE%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88,%E3%82%BF%E3%82%A4%E3%83%A0%E3%82%A2%E3%82%A6%E3%83%88%E3%81%AF%2030%20%E7%A7%92%E3%81%A7%E3%81%99%E3%80%82
puppeteerを動かすと処理が長くかかるため、lambdaからlambdaを動かすような工夫が必要かもしれません。