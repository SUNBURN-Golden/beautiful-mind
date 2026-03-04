import { expect } from "chai";
import { ethers } from "hardhat";

describe("FraudRegistry", function () {
    async function expectRevert(promise: Promise<unknown>, expectedMessage: string) {
        try {
            await promise;
            expect.fail("Expected transaction to revert");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            expect(message).to.contain(expectedMessage);
        }
    }

    async function findEventArgs(txPromise: Promise<unknown>, registry: any, eventName: string) {
        const tx = await (txPromise as Promise<{ wait: () => Promise<{ logs: Array<{ topics: string[]; data: string }> }> }>);
        const receipt = await tx.wait();
        const parsed = receipt.logs
            .map((log) => {
                try {
                    return registry.interface.parseLog(log);
                } catch {
                    return null;
                }
            })
            .filter((log): log is { name: string; args: unknown[] } => Boolean(log));

        return parsed.find((log) => log.name === eventName) || null;
    }

    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();
        const FraudRegistry = await ethers.getContractFactory("FraudRegistry");
        const registry = await FraudRegistry.deploy();
        return { registry, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { registry, owner } = await deployFixture();
            expect(await registry.owner()).to.equal(owner.address);
        });
    });

    describe("Access Control", function () {
        it("Should revert if non-owner tries to submitAnchor", async function () {
            const { registry, otherAccount } = await deployFixture();
            const root = ethers.zeroPadValue(ethers.toBeHex(1), 32);
            await expectRevert(
                registry.connect(otherAccount).submitAnchor(root, 100, 1),
                "FraudRegistry: caller is not the owner"
            );
        });

        it("Should revert if non-owner tries to reportFraud", async function () {
            const { registry, otherAccount } = await deployFixture();
            const hash1 = ethers.zeroPadValue(ethers.toBeHex(1), 32);
            const hash2 = ethers.zeroPadValue(ethers.toBeHex(2), 32);
            const hash3 = ethers.zeroPadValue(ethers.toBeHex(3), 32);
            await expectRevert(
                registry.connect(otherAccount).reportFraud(hash1, hash2, hash3, 1234, 1),
                "FraudRegistry: caller is not the owner"
            );
        });
    });

    describe("Events", function () {
        it("Should emit FraudReported with correct args", async function () {
            const { registry, owner } = await deployFixture();
            const hash1 = ethers.zeroPadValue(ethers.toBeHex(1), 32);
            const hash2 = ethers.zeroPadValue(ethers.toBeHex(2), 32);
            const hash3 = ethers.zeroPadValue(ethers.toBeHex(3), 32);

            const event = await findEventArgs(
                registry.connect(owner).reportFraud(hash1, hash2, hash3, 1234, 1),
                registry,
                "FraudReported"
            );

            expect(event).to.not.equal(null);
            expect(event!.args[0]).to.equal(hash1);
            expect(event!.args[1]).to.equal(hash2);
            expect(event!.args[2]).to.equal(hash3);
            expect(event!.args[3]).to.equal(1234n);
            expect(event!.args[4]).to.equal(1n);
        });

        it("Should emit AnchorSubmitted with correct args", async function () {
            const { registry, owner } = await deployFixture();
            const root = ethers.zeroPadValue(ethers.toBeHex(1), 32);

            const event = await findEventArgs(
                registry.connect(owner).submitAnchor(root, 100, 1),
                registry,
                "AnchorSubmitted"
            );

            expect(event).to.not.equal(null);
            expect(event!.args[0]).to.equal(root);
            expect(event!.args[1]).to.equal(100n);
            expect(event!.args[2]).to.equal(1n);
        });
    });
});
