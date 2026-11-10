#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_DIR="$WORKSPACE_DIR/.android_env"

mkdir -p "$ENV_DIR"
cd "$ENV_DIR"

echo "=================================================="
echo "🚀 1/4: OpenJDK 17 o'rnatilmoqda..."
echo "=================================================="
if [ ! -d "$ENV_DIR/jdk" ]; then
    echo "Downloading Temurin JDK 17..."
    curl -L -o jdk.tar.gz "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz"
    mkdir -p "$ENV_DIR/jdk"
    tar -xzf jdk.tar.gz -C "$ENV_DIR/jdk" --strip-components=1
    rm -f jdk.tar.gz
    echo "✅ JDK 17 o'rnatildi!"
else
    echo "✅ JDK 17 allaqachon mavjud."
fi

export JAVA_HOME="$ENV_DIR/jdk"
export PATH="$JAVA_HOME/bin:$PATH"
java -version

echo "=================================================="
echo "📱 2/4: Android SDK sozlanmoqda..."
echo "=================================================="
export ANDROID_HOME="/home/jasurbek/Android/Sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    echo "Downloading Android Command-line tools..."
    curl -L -o cmdline-tools.zip "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    unzip -q -o cmdline-tools.zip
    rm -rf "$ANDROID_HOME/cmdline-tools/latest"
    mv cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
    rm -f cmdline-tools.zip
    echo "✅ Android cmdline-tools o'rnatildi!"
else
    echo "✅ Android cmdline-tools mavjud."
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "Litsenziyalar qabul qilinmoqda va SDK yuklanmoqda..."
yes | sdkmanager --licenses >/dev/null 2>&1 || true
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo "=================================================="
echo "🎯 3/4: Flutter SDK yuklanmoqda..."
echo "=================================================="
if [ ! -d "$ENV_DIR/flutter" ]; then
    echo "Downloading Flutter SDK 3.24.5..."
    curl -L -o flutter.tar.xz "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.5-stable.tar.xz"
    tar -xf flutter.tar.xz -C "$ENV_DIR"
    rm -f flutter.tar.xz
    echo "✅ Flutter SDK o'rnatildi!"
else
    echo "✅ Flutter SDK allaqachon mavjud."
fi

export PATH="$ENV_DIR/flutter/bin:$PATH"
flutter --version

flutter config --no-analytics
flutter config --android-sdk "$ANDROID_HOME"
yes | flutter doctor --android-licenses >/dev/null 2>&1 || true

echo "=================================================="
echo "🔨 4/4: Animem Uz Release APK Yig'ilmoqda..."
echo "=================================================="
cd "$SCRIPT_DIR"

export JAVA_HOME="$ENV_DIR/jdk"
export PATH="$JAVA_HOME/bin:$ENV_DIR/flutter/bin:$PATH"

flutter config --jdk-dir "$JAVA_HOME"
flutter pub get
flutter build apk --release --no-tree-shake-icons

RELEASE_APK="$SCRIPT_DIR/build/app/outputs/flutter-apk/app-release.apk"
FINAL_APK="$WORKSPACE_DIR/animem_uz_v1.0.0.apk"

if [ -f "$RELEASE_APK" ]; then
    cp "$RELEASE_APK" "$FINAL_APK"
    echo "=================================================="
    echo "🎉 BINGO! APK Muvaffaqiyatli Tayyorlandi!"
    echo "📁 Fayl manzili: $FINAL_APK"
    ls -lh "$FINAL_APK"
    echo "=================================================="
else
    echo "❌ Xatolik: APK fayli topilmadi."
    exit 1
fi
