---
name: setup
description: Set Lymi up after the plugin is installed or first connected. Use right after install, or when the learner asks how to start with Lymi here.
---

# Set up Lymi

1. Call `list_decks` and `get_settings`. A sign-in prompt means the connection is not approved yet: ask the learner to connect Lymi and approve it, leaving **write** ticked if they want you to add cards.
2. **No decks yet:** ask which language they are learning and offer `create_deck` for it, named after the language or their course.
3. **Decks exist:** list them with their card counts and ask which deck their lessons usually go to. Keep the answer for this conversation, and in memory when the host has it.
4. Tell the learner meanings are written in their app language, `meaningLanguage`. To change it, `update_settings` with `appLanguage`; that changes Lymi's interface language too.
5. Offer three things to try, in the learner's words:
   - "Add the new words from this lesson" with a lesson pasted.
   - "What do I have due today?"
   - "Quiz me on the words I keep forgetting."
