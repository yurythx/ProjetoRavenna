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
