import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../widgets/liquid_glass_container.dart';

class MikaAiScreen extends StatefulWidget {
  const MikaAiScreen({super.key});

  @override
  State<MikaAiScreen> createState() => _MikaAiScreenState();
}

class _MikaAiScreenState extends State<MikaAiScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [
    {
      'isUser': false,
      'text': "Konnichiwa! Men Mika AI — Animem Uz sun'iy intellekt anime maslahatchisiman. Bugun qanday anime ko'rmoqchisiz? Qiziqishlaringizni aytsangiz, eng mosini topib beraman! ✨",
      'time': "Hozir",
    }
  ];

  final List<String> _suggestedPrompts = [
    "🔥 Hozirgi eng top anime qaysi?",
    "⚔️ Solo Leveling ga o'xshash anime",
    "😂 Kulgi va komediya animelari",
    "❤️ Yurakni erituvchi romantika",
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;

    setState(() {
      _messages.add({
        'isUser': true,
        'text': text.trim(),
        'time': "Hozir",
      });
      _controller.clear();
    });

    // Smart simulated response from Mika AI
    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      String response = "Ajoyib tanlov! Sizga aynan ushbu janrdagi eng sara animelarni tavsiya qilaman. Platformamiz qidiruvidan ushbu nomlarni qidirib ko'ring: 'Jujutsu Kaisen', 'Solo Leveling', 'Chainsaw Man' va 'Demon Slayer'. Barcha qismlari o'zbek tilida mavjud! 🍿";

      if (text.toLowerCase().contains('solo')) {
        response = "Solo Leveling ga o'xshash kuchli bosh qahramon va daraja ko'tarish bor animelar: 'The Eminence in Shadow', 'Overlord' va 'Sword Art Online'. Hammasi bizning ilovada bor!";
      } else if (text.toLowerCase().contains('kulgi') || text.toLowerCase().contains('komediya')) {
        response = "Kulgili va yengil animelar qidiryapsizmi? Unda 'Spy x Family', 'Kaguya-sama: Love is War' yoki 'Konosuba' ni tavsiya qilaman. Bular kun davomida a'lo kayfiyat bag'ishlaydi! 😂";
      }

      setState(() {
        _messages.add({
          'isUser': false,
          'text': response,
          'time': "Hozir",
        });
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: AppColors.primaryGradient,
                boxShadow: [
                  BoxShadow(color: AppColors.primary.withOpacity(0.5), blurRadius: 10),
                ],
              ),
              child: const Center(
                child: Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 18),
              ),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Mika AI", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                Text("Anime Maslahatchi", style: TextStyle(color: AppColors.accentCyan, fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Messages
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                physics: const BouncingScrollPhysics(),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final isUser = msg['isUser'] == true;

                  return Align(
                    alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: isUser ? AppColors.primaryGradient : null,
                        color: isUser ? null : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: isUser ? Colors.transparent : Colors.white.withOpacity(0.08),
                        ),
                      ),
                      child: Text(
                        msg['text'],
                        style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.4),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Suggested Prompts
            SizedBox(
              height: 42,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _suggestedPrompts.length,
                itemBuilder: (context, index) {
                  return GestureDetector(
                    onTap: () => _sendMessage(_suggestedPrompts[index]),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                      ),
                      child: Center(
                        child: Text(
                          _suggestedPrompts[index],
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 10),

            // Input Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: Colors.white.withOpacity(0.08))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: TextField(
                        controller: _controller,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        onSubmitted: _sendMessage,
                        decoration: const InputDecoration(
                          hintText: "Mikadan tavsiya so'rang...",
                          hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 13),
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AppColors.primaryGradient,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                      onPressed: () => _sendMessage(_controller.text),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
