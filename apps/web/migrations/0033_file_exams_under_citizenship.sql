-- The exams shelf is gone, and every deck still on it is a citizenship test, since language exam
-- lists are already on languages. Move them so they land on Citizenship without a re-publish.
UPDATE `deck_publications` SET `category` = 'citizenship' WHERE `category` = 'exams';
