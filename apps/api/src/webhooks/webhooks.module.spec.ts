import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getDataSourceToken } from '@nestjs/typeorm';
import { WebhooksModule } from './webhooks.module';
import { WebhooksService } from './webhooks.service';

// TypeOrmModule.forFeature builds its repository providers off the DataSource token, which
// forRoot normally supplies globally. Stubbing it the same way lets the real module graph
// resolve without a database.
const dataSource = {
  entityMetadatas: [],
  options: { type: 'postgres' },
  getRepository: () => ({}),
};

@Global()
@Module({
  providers: [{ provide: getDataSourceToken(), useValue: dataSource }],
  exports: [getDataSourceToken()],
})
class StubDataSourceModule { }

// An entity missing from TypeOrmModule.forFeature still compiles: tsc has no view of the
// DI graph, so the failure only appears when the app boots. This resolves the real module
// graph so the wiring is checked in CI rather than at runtime.
describe('WebhooksModule wiring', () => {
  it('resolves WebhooksService with every repository it injects', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        StubDataSourceModule,
        WebhooksModule,
      ],
    }).compile();

    expect(moduleRef.get(WebhooksService)).toBeInstanceOf(WebhooksService);
  });
});
