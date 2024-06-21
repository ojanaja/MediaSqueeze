
Aplikasi ini dikembangkan menggunakan React Native untuk melakukan kompresi gambar dengan menggunakan tiga metode kompresi yang berbeda: Entropy Coding, Run Length Encoding, Huffman Coding.

## Fitur

- Memilih gambar dari galeri

- Mengompresi gambar menggunakan metode Entropy Coding atau Run Length Encoding

- Mengompresi video menggunakan metode Entropy Coding atau Run Length Encoding

- Mengompresi audio menggunakan metode Entropy Coding atau Huffman Coding 

- Menampilkan hasil kompresi gambar

  

## Prasyarat

  

Pastikan Anda telah menginstal semua prasyarat berikut di sistem Anda:

  

- Node.js

- npm atau yarn

- React Native CLI

- Xcode (untuk iOS)

- Android Studio (untuk Android)

  

## Instalasi

1. Clone repositori ini:

```bash

git clone https://github.com/ojanaja/MediaSqueeze.git

cd MediaSqueeze

```

  

2. Instal dependensi:

  

```bash

npm install

# atau

yarn install

```

  

3. Untuk iOS, link library:

  

```bash

cd ios

pod install

cd ..

```

  

## Menjalankan Aplikasi

  

### iOS

  

Jalankan perintah berikut untuk memulai aplikasi di iOS simulator:

  

```bash

npx  react-native  run-ios

```

  

### Android

  

Jalankan perintah berikut untuk memulai aplikasi di Android emulator:

  

```bash

npx  react-native  run-android

```

  

## Penggunaan

  

1. Buka aplikasi.

2. Pilih gambar dari galeri.

3. Pilih metode kompresi:

		Entropy Coding

		Run Length Encoding 

		Huffman Coding

4. Lihat hasil kompresi dan ukuran file yang dihasilkan.

## Kontribusi

  

Silakan buat issue atau pull request jika Anda ingin berkontribusi pada proyek ini.
