#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "⚡ ANIMEM UZ - ANDROID APK AVTOMATIK YIG'ISH JARAYONI ⚡"
echo "=========================================================="

WORKSPACE_DIR="/home/jasurbek/Documents/Animem Uz1"
BASE_DIR="/home/jasurbek/Android"
JAVA_HOME="$BASE_DIR/jdk"
ANDROID_HOME="$BASE_DIR/Sdk"
FLUTTER_HOME="$BASE_DIR/flutter"

mkdir -p "$BASE_DIR" "$ANDROID_HOME"

export JAVA_HOME="$JAVA_HOME"
export ANDROID_HOME="$ANDROID_HOME"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$FLUTTER_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "☕ Java: $(java -version 2>&1 | head -n 1)"
echo "🎯 Flutter: $(flutter --version | head -n 1)"
echo "📱 Sdkmanager: $(sdkmanager --version)"

echo "=========================================================="
echo "📦 1/3: Android Platform 35 va Build-tools o'rnatilmoqda..."
echo "=========================================================="
if [ ! -d "$ANDROID_HOME/platforms/android-35" ] || [ ! -d "$ANDROID_HOME/build-tools/35.0.0" ]; then
    echo "⬇️ Android 35 SDK va Build-tools yuklab olinmoqda..."
    yes | sdkmanager --licenses >/dev/null 2>&1 || true
    sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" "platforms;android-34" "build-tools;34.0.0"
    echo "✅ Android 35 SDK muvaffaqiyatli yuklandi!"
else
    echo "✅ Android 35 SDK allaqachon mavjud."
fi

echo "🔧 Flutter sozlanmoqda..."
flutter config --no-analytics >/dev/null 2>&1 || true
flutter config --android-sdk "$ANDROID_HOME" >/dev/null 2>&1 || true
flutter config --jdk-dir "$JAVA_HOME" >/dev/null 2>&1 || true
yes | flutter doctor --android-licenses >/dev/null 2>&1 || true

# Update local.properties
cat << EOF > "$WORKSPACE_DIR/animem_flutter/android/local.properties"
sdk.dir=$ANDROID_HOME
flutter.sdk=$FLUTTER_HOME
flutter.buildMode=release
flutter.versionName=1.0.0
flutter.versionCode=1
EOF

echo "=========================================================="
echo "🔨 2/3: Flutter Clean & Pub Get..."
echo "=========================================================="
cd "$WORKSPACE_DIR/animem_flutter"
flutter clean
flutter pub get

echo "=========================================================="
echo "🚀 3/3: Animem Uz Release APK Yig'ilmoqda..."
echo "=========================================================="
flutter build apk --release --no-tree-shake-icons

RELEASE_APK="$WORKSPACE_DIR/animem_flutter/build/app/outputs/flutter-apk/app-release.apk"
FINAL_APK="$WORKSPACE_DIR/animem_uz_v1.0.0.apk"
FINAL_APK_SHORT="$WORKSPACE_DIR/app-release.apk"

if [ -f "$RELEASE_APK" ]; then
    cp "$RELEASE_APK" "$FINAL_APK"
    cp "$RELEASE_APK" "$FINAL_APK_SHORT"
    echo "=========================================================="
    echo "🎉🎉🎉 BINGO! ANIMEM UZ APK MUVAFFAQIYATLI TAYYORLANDI! 🎉🎉🎉"
    echo "📱 APK Fayl manzili: $FINAL_APK"
    ls -lh "$FINAL_APK"
    echo "=========================================================="
else
    echo "❌ Xatolik: APK fayli topilmadi!"
    exit 1
fi
