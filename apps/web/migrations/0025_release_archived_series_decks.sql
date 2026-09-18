-- A series archived before Delete replaced Restore left its decks naming it forever, because
-- deleting an already-archived series returns early. Nothing can reach those series, so release
-- their decks the way a delete now does; an archived deck stays archived and comes back loose.
UPDATE `decks` SET `series_id` = NULL, `position` = 0 WHERE `series_id` IN (
	SELECT `id` FROM `series` WHERE `archived_at` IS NOT NULL
);
