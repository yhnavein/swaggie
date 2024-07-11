using System.IO;
using Microsoft.AspNetCore.Hosting;

namespace Swaggie.Swashbuckle;

public static class Program
{
  public static void Main(string[] args)
  {
    var host = new WebHostBuilder()
      .UseKestrel()
      .UseContentRoot(Directory.GetCurrentDirectory())
      .UseStartup<Startup>()
      .UseUrls("http://127.0.0.1:12345")
      .Build();

    host.Run();
  }
}
