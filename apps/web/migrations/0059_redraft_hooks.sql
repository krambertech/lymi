-- Unkept hook drafts from the old prompt are cleared so the next editor drafts again; saved hooks stay.
UPDATE `cards` SET `hook_draft` = NULL WHERE `hook_draft` IS NOT NULL;
