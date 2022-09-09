---
title: "Backend APIの作成をエンジニアに依頼するTips"
emoji: "📘"
type: "idea" # tech: 技術記事 / idea: アイデア
topics: ["開発","backend","openapi"]
published: false
---

## 概要
Backend APIの開発をエンジニアさんに依頼する際のTips。

## 背景
Backend APIの開発において、エンジニアさんと一緒にお仕事する機会がありました。
APIの開発を依頼する際に、どんな情報が揃っていればいいのか考えてみました。


## タスクの割り振り方法
新しくAPIを作成する時、以下のタスクは自分でやって、中身の開発をエンジニアさんにお願いしていました。
- テーブルの設計をする
- API仕様がわかるドキュメントを書く
- issueを書く
- issueの説明をする

### 前提
nestjsを使用してバックエンドを開発するとします。  

### 縛り
Microsoft系のソフトウェア(word,excel)を使用してドキュメントを作成しないように頑張りました。

### 具体的に
実際にどのようにして作成したのか、説明します。
今回は簡単なuserを作成するだけのAPIを例に説明します。

#### テーブルの設計をする
テーブル設計書エクセルで書く時間があれば、コードは書けますので、コードを書きます。  
今回はTypeORMを使用してテーブルの定義を行いました。  
ドキュメントが欲しい場合は、[tbls](https://github.com/k1LoW/tbls)を使用して、データベースから自動で作成しましょう。  

```ts
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '姓' })
  firstName: string;

  @Column({ comment: '名' })
  lastName: string;

  @Column({ comment: '有効フラグ', default: true })
  isActive: boolean;
}
```

#### API仕様がわかるドキュメントを書く
nestでは、デコレータを利用してOpenAPIを生成するモジュールを提供しているので、これを利用します。  
実際には以下のように、APIを定義して、各々のAPIの期待するリクエストとレスポンスを定義します。  

```ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto, UpdateUserDto, UserDto } from './user.dto';

@Controller('users')
// Tagをつける
@ApiTags('users')
export class UserController {
  constructor() {}

  @Get()
  // このAPIを使用した時に返ってきて欲しいレスポンスを定義
  @ApiResponse({ type: UserDto, isArray: true })
  findAll(): Promise<UserDto[]> {
    // エンジニアさんにやってもらう部分
    throw new Error('未実装');
  }

  @Get(':userId')
  // このAPIを使用した時に返ってきて欲しいレスポンスを定義
  @ApiResponse({ type: UserDto })
  findOne(@Param('userId') userId: number): Promise<UserDto> {
    // エンジニアさんにやってもらう部分
    throw new Error('未実装');
  }

  @Post()
  // このAPIを使用した時に返ってきて欲しいレスポンスを定義
  @ApiResponse({ type: UserDto })
  create(@Body() createDto: CreateUserDto): Promise<UserDto> {
    // エンジニアさんにやってもらう部分
    throw new Error('未実装');
  }

  @Patch(':userId')
  // このAPIを使用した時に返ってきて欲しいレスポンスを定義
  @ApiResponse({ type: UserDto })
  update(
    @Param('userId') userId: number,
    @Body() createDto: UpdateUserDto,
  ): Promise<UserDto> {
    // エンジニアさんにやってもらう部分
    throw new Error('未実装');
  }

  @Delete(':userId')
  @ApiNoContentResponse()
  delete(@Param('userId') userId: number): Promise<number> {
    // エンジニアさんにやってもらう部分
    throw new Error('未実装');
  }
}
}
```

```ts
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: 'user id', example: 1 })
  id: number;

  @ApiProperty({ description: '性', example: '山田' })
  firstName: string;

  @ApiProperty({ description: '名', example: '太郎' })
  lastName: string;

  @ApiProperty({ description: '有効フラグ', example: true })
  isActive: boolean;
}

export class CreateUserDto {
  @ApiProperty({ description: '性', example: '山田', required: true })
  firstName: string;

  @ApiProperty({ description: '名', example: '太郎', required: true })
  lastName: string;

  @ApiProperty({ description: '有効フラグ', example: true, required: true })
  isActive: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

コメントの「//エンジニアさんにやってもらう部分」がエンジニアさんに実装してもらう部分となります。

実際にSwaggerで確認すると以下のように見ることができます。  
![](/images/develop-backend-api/swagger-main.png)

PATCHを覗いて見るといい感じですね！
![](/images/develop-backend-api/swagger-patch.png)

OpenAPIをコードで書くのは、精神的にも安定しますね！
OpenAPIがあると、インプットとアウトプットが定義されますので、開発する側も、何を開発すれば良いのかイメージしやすいです。

#### issueを書く
issueを作成して、作成して欲しいAPIの仕様を書きます。
例）https://github.com/NoriyukiMatsumoto/zenn/issues/1

#### issueの説明をする
複雑な処理を行うAPIは口頭で説明します。

## 学び

### こまめにミーティングを行う
基本的にコードの修正が伴うものは、すべてissueを立てて、そのissueに対してミーティングを行いました。
ミーティングを細かく行う事で、爆弾を抱えることなくスムーズに開発できたのかなぁと思います。

### OpenAPIを書くとスムーズに理解してくれる
OpenAPIを出力して、実際のリクエストの内容とレスポンスの内容を定義すると、開発がスムーズに進みました。  

### issueにER図を書いてあげる
関連するテーブルのER図を書いておくと、理解しやすいですし、説明しやすいです。
今回は、mermaidというサービスを使用してER図を簡単に書きました。
  
  
おしまい。