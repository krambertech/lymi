-- Published decks the public site's E2E Worker reads. Private fields carry PRIVATE so a leak shows.
INSERT INTO user (id, name, email) VALUES
  ('e2e-publisher', 'PRIVATE Publisher Account', 'private-publisher@lymi.local'),
  ('e2e-member', 'PRIVATE Member', 'private-member@lymi.local');

INSERT INTO decks (id, user_id, name, default_language, description) VALUES
  ('e2e-deck-evening', 'e2e-publisher', 'Evening Estonian', 'et', 'PRIVATE description'),
  ('e2e-deck-withdrawn', 'e2e-publisher', 'Withdrawn Estonian', 'et', NULL);
INSERT INTO decks (id, user_id, name, default_language, archived_at) VALUES
  ('e2e-deck-archived', 'e2e-publisher', 'Archived Estonian', 'et', unixepoch() * 1000);

INSERT INTO sections (id, deck_id, name, position) VALUES
  ('e2e-section-cafe', 'e2e-deck-evening', 'In the café', 1),
  ('e2e-section-greetings', 'e2e-deck-evening', 'Greetings', 0);

INSERT INTO cards (id, user_id, deck_id, section_id, term, meaning, notes, example) VALUES
  ('e2e-card-1', 'e2e-publisher', 'e2e-deck-evening', 'e2e-section-greetings', 'tere päevast', 'good afternoon', 'PRIVATE note', 'PRIVATE example'),
  ('e2e-card-2', 'e2e-publisher', 'e2e-deck-evening', 'e2e-section-cafe', 'üks kohv, palun', 'one coffee, please', NULL, NULL),
  ('e2e-card-3', 'e2e-publisher', 'e2e-deck-evening', 'e2e-section-greetings', 'head õhtut', 'good evening', NULL, NULL),
  ('e2e-card-4', 'e2e-publisher', 'e2e-deck-evening', 'e2e-section-greetings', 'head ööd', 'good night', NULL, NULL),
  ('e2e-card-5', 'e2e-publisher', 'e2e-deck-withdrawn', NULL, 'nägemist', 'bye', NULL, NULL),
  ('e2e-card-6', 'e2e-publisher', 'e2e-deck-archived', NULL, 'aitäh', 'thank you', NULL, NULL);
INSERT INTO cards (id, user_id, deck_id, section_id, term, meaning, archived_at) VALUES
  ('e2e-card-archived', 'e2e-publisher', 'e2e-deck-evening', 'e2e-section-greetings', 'PRIVATE archived card', 'gone', unixepoch() * 1000);

INSERT INTO deck_members (id, deck_id, user_id, role, joined_at) VALUES
  ('e2e-member-evening', 'e2e-deck-evening', 'e2e-member', 'learner', unixepoch() * 1000);

INSERT INTO deck_publications (id, deck_id, slug, status, summary, level, meaning_language, publisher, sources, revision, published_at, withdrawn_at) VALUES
  ('e2e-pub-evening', 'e2e-deck-evening', 'evening-estonian', 'published', 'Phrases for the end of the day.', 'A1', 'en', 'Lymi', '[{"title":"Keeleklikk","url":"https://www.keeleklikk.ee/"}]', 3, unixepoch() * 1000, NULL),
  ('e2e-pub-withdrawn', 'e2e-deck-withdrawn', 'withdrawn-estonian', 'withdrawn', 'Gone.', 'A1', 'en', 'Lymi', '[]', 2, unixepoch() * 1000, unixepoch() * 1000),
  ('e2e-pub-archived', 'e2e-deck-archived', 'archived-estonian', 'published', 'Archived.', 'A1', 'en', 'Lymi', '[]', 1, unixepoch() * 1000, NULL);
