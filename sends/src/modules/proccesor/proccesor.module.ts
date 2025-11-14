import { Module } from "@nestjs/common";
import { ProccesorService } from "./services/proccesor.service";

@Module({
    imports: [],
    controllers: [],
    providers: [ProccesorService],
    exports: [ProccesorService]
})
export class ProccesorModule {}