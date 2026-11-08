#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Animem Uz Flutter APK Yig'ish Skripti"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if command -v flutter >/dev/null 2>&1; then
    echo "✅ Flutter SDK topildi: $(flutter --version | head -n 1)"
else
    echo "⚠️ Tizimda Flutter topilmadi."
    echo "Iltimos, Flutter SDK ni o'rnating yoki GitHub Actions avtomatik APK yig'ish tizimidan foydalaning."
    echo "O'rnatish yo'riqnomasi: https://docs.flutter.dev/get-started/install"
    exit 1
fi

echo "📦 Paketlar yuklanmoqda (flutter pub get)..."
flutter pub get

echo "🔨 Release APK yig'ilmoqda (flutter build apk --release)..."
flutter build apk --release --no-tree-shake-icons

APK_PATH="$SCRIPT_DIR/build/app/outputs/flutter-apk/app-release.apk"
if [ -f "$APK_PATH" ]; then
    echo "=========================================="
    echo "🎉 APK Muvaffaqiyatli Tayyorlandi!"
    echo "📁 Fayl manzili: $APK_PATH"
    echo "=========================================="
else
    echo "❌ APK fayli hosil bo'lmadi."
    exit 1
fi
