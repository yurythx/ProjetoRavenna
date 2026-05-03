// =============================================================================
// HealthServer.cs — Servidor HTTP mínimo para health check do container
// =============================================================================
//
// Responde a qualquer requisição HTTP em HEALTH_PORT (padrão: 7778) com
// "200 OK" e corpo "OK". Utilizado pelo Docker Compose e Kubernetes para
// determinar se o container está saudável e pronto para receber tráfego.
//
// Como configurar no docker-compose.yml:
//   healthcheck:
//     test: ["CMD", "curl", "-f", "http://localhost:7778/"]
//     interval: 10s
//     timeout: 3s
//     retries: 3
//
// Não processa o caminho da requisição — qualquer path retorna 200 OK.
// =============================================================================
using System.Net;
using System.Net.Sockets;
using System.Text;

internal static class HealthServer
{
    private static readonly byte[] _ok = Encoding.ASCII.GetBytes(
        "HTTP/1.1 200 OK\r\nContent-Length: 2\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nOK");

    public static Task RunAsync(int port, CancellationToken ct) => Task.Run(async () =>
    {
        var listener = new TcpListener(IPAddress.Any, port);
        listener.Start();
        Console.WriteLine($"[Ravenna] Health HTTP  port={port}");

        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var client = await listener.AcceptTcpClientAsync(ct);
                client.ReceiveTimeout = 2_000;
                await using var stream = client.GetStream();
                var buf = new byte[2048];
                _ = await stream.ReadAsync(buf, ct);    // drain HTTP request
                await stream.WriteAsync(_ok, ct);
            }
            catch (OperationCanceledException) { break; }
            catch { }
        }

        listener.Stop();
    }, CancellationToken.None);
}
