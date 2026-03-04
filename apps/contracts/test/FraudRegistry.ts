import { expect } from "chai";
import { ethers } from "hardhat";

describe("FraudRegistry", function () {
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
            await expect(registry.connect(otherAccount).submitAnchor(root, 100, 1))
                .to.be.revertedWith("FraudRegistry: caller is not the owner");
        });

        it("Should revert if non-owner tries to reportFraud", async function () {
            const { registry, otherAccount } = await deployFixture();
            const hash1 = ethers.zeroPadValue(ethers.toBeHex(1), 32);
            const hash2 = ethers.zeroPadValue(ethers.toBeHex(2), 32);
            const hash3 = ethers.zeroPadValue(ethers.toBeHex(3), 32);
            await expect(registry.connect(otherAccount).reportFraud(hash1, hash2, hash3, 1234, 1))
                .to.be.revertedWith("FraudRegistry: caller is not the owner");
        });
    });

    describe("Events", function () {
        it("Should emit FraudReported with correct args", async function () {
            const { registry, owner } = await deployFixture();
            const hash1 = ethers.zeroPadValue(ethers.toBeHex(1), 32);
            const hash2 = ethers.zeroPadValue(ethers.toBeHex(2), 32);
            const hash3 = ethers.zeroPadValue(ethers.toBeHex(3), 32);

            await expect(registry.connect(owner).reportFraud(hash1, hash2, hash3, 1234, 1))
                .to.emit(registry, "FraudReported")
                .withArgs(hash1, hash2, hash3, 1234, 1);
        });

        it("Should emit AnchorSubmitted with correct args", async function () {
            const { registry, owner } = await deployFixture();
            const root = ethers.zeroPadValue(ethers.toBeHex(1), 32);

            await expect(registry.connect(owner).submitAnchor(root, 100, 1))
                .to.emit(registry, "AnchorSubmitted")
                .withArgs(root, 100, 1);
        });
    });
});
