# Sign in with Apple

The signed-out screen offers **Continue with Apple**, in the same secondary button style as Google and email, only where `isAvailableAsync()` succeeds. The phone sends a fresh nonce's hash to Apple and its raw value with the signed token to Better Auth. A cancelled sheet leaves the learner at the door without an error; a failure leaves a retry. The first name Apple supplies is kept, and SecureStore keeps the session across relaunches.

## Reach

The signed-out start screen.

## Drive

[`sign-in.yaml`](sign-in.yaml): sign out through [`_signed-out.yaml`](_signed-out.yaml), then check **Continue with Apple**, **Continue with Google** and **Sign in with email**.

## End state

The three choices show, and [`sign-in.mjs`](sign-in.mjs) finds the learner's stored counts unchanged.

## Gotchas

- The flow proves the control is present in an Apple-capable development binary; it does not complete Apple authentication. A physical iPhone verifies first sign-in with a shared address and with Hide My Email, cancellation, relaunch and repeat sign-in, and deletion confirmed with Apple.
- Deletion must revoke the app's grant when the signing key is configured, and web and native must open the same account when they use the grouped App ID and Services ID.
