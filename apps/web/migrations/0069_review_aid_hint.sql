-- A peek before the reveal is recorded as `hint` now; the old Worker never reads `aid` back.
UPDATE `reviews` SET `aid` = 'hint' WHERE `aid` = 'hook';
